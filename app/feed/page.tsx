import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FeedContent, { type FeedItem } from '@/components/feed/FeedContent';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import DismissibleBanner from '@/components/ui/DismissibleBanner';
import FoldNote from '@/components/ui/FoldNote';
import { activeSinceByChannel, isAfterActiveSince } from '@/lib/subscriptions/active-window';
import { passesDurationFilters } from '@/lib/youtube/duration';
import { chunk, selectSummarizedRows, toDigestDates } from '@/lib/feed/digests';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

// done 영상 스캔 상한(최신순). 이 중 요약(ko) 있는 것만 다이제스트로 취급한다.
// 표시 상한(FEED_DISPLAY_LIMIT)보다 넉넉히 커야, 아직 요약 안 된 done(전사만 된 상태)에 밀려
// 최근 다이제스트가 스캔 창 밖으로 잘리지 않는다.
const FEED_DONE_LIMIT = 800;
// 캘린더·카드에 실을 다이제스트(요약 있는 done) 상한. 캘린더와 카드가 동일 집합을 공유한다.
const FEED_DISPLAY_LIMIT = 200;
// PostgREST .in() 한 요청당 id 개수 상한(대량이면 URL 길이로 400). 이 단위로 청크 조회.
const IN_CHUNK = 100;

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
  let digestDates: { c: string; d: string }[] = [];

  const items: FeedItem[] = [];

  if (channelIds.length > 0) {
    // done 영상을 최신순으로 조회(FEED_DONE_LIMIT). 이 중 요약(ko) 있는 것만 다이제스트다.
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
    const doneIds = doneRows.map((v) => v.id);

    if (doneIds.length > 0) {
      // 요약(ko)은 done 전체를 대상으로 조회해 "어떤 done 이 실제 다이제스트인지" 판정한다.
      // PostgREST 의 .in() 은 값이 많으면 URL 길이 한계로 400 을 내므로 청크로 나눠 조회 후 병합.
      const sumChunks = await Promise.all(
        chunk(doneIds, IN_CHUNK).map((c) =>
          supabase
            .from('summaries')
            .select('video_id, length_mode, core_text, body')
            .eq('language', 'ko')
            .in('video_id', c),
        ),
      );
      const sums = sumChunks.flatMap((r) => r.data ?? []);
      const byVideo = new Map<string, Partial<Record<LengthMode, ModeSummary>>>();
      for (const s of sums) {
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

      // 캘린더 집계와 카드는 동일 집합(요약 있는 done)에서 나온다 → 숫자 불일치 방지.
      const summarizedRows = selectSummarizedRows(
        doneRows,
        (id) => byVideo.has(id),
        FEED_DISPLAY_LIMIT,
      );
      digestDates = toDigestDates(summarizedRows, (iso) => kstFmt.format(new Date(iso)));

      // 길이 선택·북마크는 표시 대상(≤FEED_DISPLAY_LIMIT)만 — 역시 청크 조회.
      const shownIds = summarizedRows.map((v) => v.id);
      const [prefChunks, bmChunks] = await Promise.all([
        Promise.all(
          chunk(shownIds, IN_CHUNK).map((c) =>
            supabase.from('user_video_prefs').select('video_id, length_mode').in('video_id', c),
          ),
        ),
        Promise.all(
          chunk(shownIds, IN_CHUNK).map((c) =>
            supabase.from('bookmarks').select('video_id').in('video_id', c),
          ),
        ),
      ]);
      const bookmarkedIds = new Set(bmChunks.flatMap((r) => r.data ?? []).map((b) => b.video_id));
      const prefByVideo = new Map(
        prefChunks.flatMap((r) => r.data ?? []).map((p) => [p.video_id, p.length_mode as LengthMode]),
      );

      for (const v of summarizedRows) {
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
          bookmarked: bookmarkedIds.has(v.id),
        });
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4">
          <DismissibleBanner
            storageKey="gk_feed_intro_dismissed"
            title="다이제스트"
            description="구독한 채널의 새 영상 요약입니다. 카드마다 요약 길이를 바꿀 수 있어요."
          />
        </div>
        <div className="mb-6">
          <FoldNote
            testId="feed-how-to"
            title="다이제스트, 이렇게 써요"
            points={[
              '구독한 채널의 새 영상을 대신 보고, 핵심만 요약해 카드로 보여드려요.',
              '카드마다 짧게 / 보통 / 길게로 요약 길이를 바꿀 수 있어요.',
              '달력에서 날짜를 고르고 채널 필터로 좁혀 볼 수 있어요.',
              '북마크(노란 아이콘)로 저장하면 상단 "북마크" 탭에서 모아볼 수 있어요.',
              'AI 배지를 눌러 이 콘텐츠에 대해 궁금한 점을 물어볼 수 있어요.',
            ]}
          />
        </div>

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
