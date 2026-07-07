import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FeedContent, { type FeedItem } from '@/components/feed/FeedContent';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { activeSinceByChannel, isAfterActiveSince } from '@/lib/subscriptions/active-window';
import { passesDurationFilters } from '@/lib/youtube/duration';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

// 캘린더·표시용 done 조회 상한(최신순). 데이터 증가 시 서버시간 상한 유지(오래된 다이제스트는 제외).
const FEED_DONE_LIMIT = 500;

/** 요약 열람 피드. 카드별 요약 길이(짧게/보통/길게) 선택 — default 는 설정, 영상별 저장값 우선. */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialDate =
    typeof sp.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;

  const supabase = await createClient();
  // proxy 가 이미 세션을 검증했으므로 getSession(네트워크 없음)으로 사용자 id 만 읽는다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  // 서로 독립적인 두 쿼리는 병렬로 (직렬 왕복 제거).
  const [{ data: subs }, { data: setting }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('channel_id, channel_title, channel_thumbnail, channel_handle, paused, active_since')
      .eq('user_id', user.id),
    supabase
      .from('user_settings')
      .select('summary_length, exclude_over_2h')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  const globalMode = (setting?.summary_length ?? 'normal') as LengthMode;
  const excludeOver2h = setting?.exclude_over_2h ?? true;
  // 일시정지된 채널은 다이제스트에서 제외(피드·캘린더·채널필터 모두).
  const activeSubs = (subs ?? []).filter((s) => !s.paused);
  const sinceByChannel = activeSinceByChannel(activeSubs);
  const channelIds = [...new Set(activeSubs.map((s) => s.channel_id))];
  const channelTitleById = new Map(activeSubs.map((s) => [s.channel_id, s.channel_title ?? '']));
  const channelThumbById = new Map(activeSubs.map((s) => [s.channel_id, s.channel_thumbnail]));
  const channelHandleById = new Map(activeSubs.map((s) => [s.channel_id, s.channel_handle]));
  const channels = activeSubs.map((s) => ({
    id: s.channel_id,
    title: s.channel_title ?? s.channel_id,
    thumbnail: s.channel_thumbnail,
  }));

  // 캘린더: 오늘(KST) 기본값. 일자별 수는 채널 필터에 따라 클라이언트에서 재집계하도록 원본 전달.
  const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const digestDates: { c: string; d: string }[] = [];

  const items: FeedItem[] = [];

  if (channelIds.length > 0) {
    // done 영상을 최신순으로 조회 — 캘린더 집계(digestDates)와 최근 50개 표시를 겸한다.
    // 데이터 증가 대비 상한(FEED_DONE_LIMIT): 최근 N개까지만(캘린더는 그 범위, 표시는 상위 50).
    const kstFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
    const { data: doneVideos } = await supabase
      .from('videos')
      .select('id, title, url, channel_id, published_at, duration_seconds, created_at')
      .eq('status', 'done')
      .in('channel_id', channelIds)
      .order('published_at', { ascending: false })
      .limit(FEED_DONE_LIMIT);
    // 정지해제 기준선(active_since) 이후 + 영상 길이 필터(1분미만 항상 제외, 2시간이상 옵션).
    const doneRows = (doneVideos ?? [])
      .filter((v) => isAfterActiveSince(v.created_at, sinceByChannel.get(v.channel_id)))
      .filter((v) => passesDurationFilters(v.duration_seconds, excludeOver2h));
    for (const r of doneRows) {
      if (!r.published_at) continue;
      digestDates.push({ c: r.channel_id, d: kstFmt.format(new Date(r.published_at)) });
    }

    // 표시는 최신 50개만 (캘린더는 위에서 전체 집계 완료).
    const videoRows = doneRows.slice(0, 50);
    const videoIds = videoRows.map((v) => v.id);

    if (videoIds.length > 0) {
      // 영상별 길이 선택 + 요약(ko) — 서로 독립이라 병렬로 조회.
      const [{ data: prefs }, { data: sums }] = await Promise.all([
        supabase
          .from('user_video_prefs')
          .select('video_id, length_mode')
          .in('video_id', videoIds),
        // 모든 길이 모드 요약(ko) — 카드별 전환이 즉시 되도록 3개 모드 모두 로드
        supabase
          .from('summaries')
          .select('video_id, length_mode, core_text, body')
          .eq('language', 'ko')
          .in('video_id', videoIds),
      ]);
      const prefByVideo = new Map(
        (prefs ?? []).map((p) => [p.video_id, p.length_mode as LengthMode]),
      );
      const byVideo = new Map<string, Partial<Record<LengthMode, ModeSummary>>>();
      for (const s of sums ?? []) {
        const bullets =
          s.body && typeof s.body === 'object' && 'bullets' in s.body
            ? ((s.body as { bullets?: unknown }).bullets as string[]) ?? []
            : [];
        const rec = byVideo.get(s.video_id) ?? {};
        rec[s.length_mode as LengthMode] = {
          coreText: s.core_text ?? '',
          bullets: Array.isArray(bullets) ? bullets : [],
        };
        byVideo.set(s.video_id, rec);
      }

      for (const v of videoRows) {
        const summaries = byVideo.get(v.id);
        if (!summaries || Object.keys(summaries).length === 0) continue;
        const pref = prefByVideo.get(v.id);
        const initialMode: LengthMode =
          pref && summaries[pref]
            ? pref
            : summaries[globalMode]
              ? globalMode
              : (Object.keys(summaries)[0] as LengthMode);
        items.push({
          id: v.id,
          channelId: v.channel_id,
          title: v.title ?? '',
          url: v.url ?? '',
          channelTitle: channelTitleById.get(v.channel_id) ?? '',
          channelThumbnail: channelThumbById.get(v.channel_id) ?? null,
          channelHandle: channelHandleById.get(v.channel_id) ?? null,
          publishedAt: v.published_at,
          durationSeconds: v.duration_seconds,
          dateKst: v.published_at ? kstFmt.format(new Date(v.published_at)) : '',
          initialMode,
          summaries,
        });
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">다이제스트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            구독한 채널의 새 영상 요약입니다. 카드마다 요약 길이를 바꿀 수 있어요.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">아직 요약된 영상이 없습니다.</p>
            <Link
              href="/subscriptions"
              className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
            >
              채널 구독하기 →
            </Link>
          </div>
        ) : (
          <FeedContent
            items={items}
            channels={channels}
            digestDates={digestDates}
            todayKst={todayKst}
            initialDate={initialDate}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
