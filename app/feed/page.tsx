import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SummaryCard from '@/components/feed/SummaryCard';
import DigestCalendar from '@/components/feed/DigestCalendar';
import AppHeader from '@/components/layout/AppHeader';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

/** 요약 열람 피드. 카드별 요약 길이(짧게/보통/길게) 선택 — default 는 설정, 영상별 저장값 우선. */
export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id, channel_title')
    .eq('user_id', user.id);
  const channelIds = [...new Set((subs ?? []).map((s) => s.channel_id))];
  const channelTitleById = new Map((subs ?? []).map((s) => [s.channel_id, s.channel_title ?? '']));

  const { data: setting } = await supabase
    .from('user_settings')
    .select('summary_length')
    .eq('user_id', user.id)
    .maybeSingle();
  const globalMode = (setting?.summary_length ?? 'normal') as LengthMode;

  // 캘린더: 오늘(KST) 기본값 + 일자별 다이제스트 수
  const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const countsByDate: Record<string, number> = {};

  const items: {
    id: string;
    title: string;
    url: string;
    channelTitle: string;
    publishedAt: string | null;
    initialMode: LengthMode;
    summaries: Partial<Record<LengthMode, ModeSummary>>;
  }[] = [];

  if (channelIds.length > 0) {
    // 일자별 다이제스트 수 (모든 done 영상, published_at KST 기준)
    const { data: allDone } = await supabase
      .from('videos')
      .select('published_at')
      .eq('status', 'done')
      .in('channel_id', channelIds);
    const kstFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
    for (const r of allDone ?? []) {
      if (!r.published_at) continue;
      const key = kstFmt.format(new Date(r.published_at));
      countsByDate[key] = (countsByDate[key] ?? 0) + 1;
    }

    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, url, channel_id, published_at')
      .eq('status', 'done')
      .in('channel_id', channelIds)
      .order('published_at', { ascending: false })
      .limit(50);
    const videoRows = videos ?? [];
    const videoIds = videoRows.map((v) => v.id);

    if (videoIds.length > 0) {
      // 영상별 저장된 길이 선택
      const { data: prefs } = await supabase
        .from('user_video_prefs')
        .select('video_id, length_mode')
        .in('video_id', videoIds);
      const prefByVideo = new Map(
        (prefs ?? []).map((p) => [p.video_id, p.length_mode as LengthMode]),
      );

      // 모든 길이 모드 요약(ko) — 카드별 전환이 즉시 되도록 3개 모드 모두 로드
      const { data: sums } = await supabase
        .from('summaries')
        .select('video_id, length_mode, core_text, body')
        .eq('language', 'ko')
        .in('video_id', videoIds);
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
          title: v.title ?? '',
          url: v.url ?? '',
          channelTitle: channelTitleById.get(v.channel_id) ?? '',
          publishedAt: v.published_at,
          initialMode,
          summaries,
        });
      }
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">다이제스트</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            구독한 채널의 새 영상 요약입니다. 카드마다 요약 길이를 바꿀 수 있어요.
          </p>
        </header>

        <div className="mb-6">
          <DigestCalendar todayKst={todayKst} countsByDate={countsByDate} />
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
          <div data-testid="feed-list" className="flex flex-col gap-4">
            {items.map((it) => (
              <SummaryCard
                key={it.id}
                videoId={it.id}
                channelTitle={it.channelTitle}
                title={it.title}
                url={it.url}
                publishedAt={it.publishedAt}
                initialMode={it.initialMode}
                summaries={it.summaries}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
