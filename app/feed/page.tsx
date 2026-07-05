import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SummaryCard from '@/components/feed/SummaryCard';
import LengthSelector from '@/components/feed/LengthSelector';
import AppHeader from '@/components/layout/AppHeader';
import type { LengthMode } from '@/lib/summary/format';

/** 요약 열람 피드. 본인 구독 채널의 요약된 영상(선택한 요약 길이 모드). */
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
  const mode = (setting?.summary_length ?? 'normal') as LengthMode;

  const items: {
    id: string;
    title: string;
    url: string;
    channelTitle: string;
    publishedAt: string | null;
    coreText: string;
    bullets: string[];
  }[] = [];

  if (channelIds.length > 0) {
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
      const { data: sums } = await supabase
        .from('summaries')
        .select('video_id, core_text, body')
        .eq('length_mode', mode)
        .eq('language', 'ko')
        .in('video_id', videoIds);
      const sumMap = new Map((sums ?? []).map((s) => [s.video_id, s]));

      for (const v of videoRows) {
        const s = sumMap.get(v.id);
        if (!s) continue;
        const bullets =
          s.body && typeof s.body === 'object' && 'bullets' in s.body
            ? ((s.body as { bullets?: unknown }).bullets as string[]) ?? []
            : [];
        items.push({
          id: v.id,
          title: v.title ?? '',
          url: v.url ?? '',
          channelTitle: channelTitleById.get(v.channel_id) ?? '',
          publishedAt: v.published_at,
          coreText: s.core_text ?? '',
          bullets: Array.isArray(bullets) ? bullets : [],
        });
      }
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">다이제스트</h1>
            <p className="mt-1 text-sm text-muted-foreground">구독한 채널의 새 영상 요약입니다.</p>
          </div>
          <LengthSelector current={mode} />
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
          <div data-testid="feed-list" className="flex flex-col gap-4">
            {items.map((it) => (
              <SummaryCard
                key={it.id}
                channelTitle={it.channelTitle}
                title={it.title}
                url={it.url}
                publishedAt={it.publishedAt}
                coreText={it.coreText}
                bullets={it.bullets}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
