import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SummaryCard from '@/components/feed/SummaryCard';
import type { LengthMode } from '@/lib/summary/format';

/** 요약 열람 피드 (SSR REQ-D3 열람 + 언어 전환). 본인 구독 채널의 요약된 영상. */
export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id')
    .eq('user_id', user.id);
  const channelIds = [...new Set((subs ?? []).map((s) => s.channel_id))];

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
    ko: { headline: string; coreText: string; bullets: string[] };
  }[] = [];

  if (channelIds.length > 0) {
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, url')
      .eq('status', 'done')
      .in('channel_id', channelIds)
      .order('published_at', { ascending: false })
      .limit(50);
    const videoRows = videos ?? [];
    const videoIds = videoRows.map((v) => v.id);

    if (videoIds.length > 0) {
      const { data: sums } = await supabase
        .from('summaries')
        .select('video_id, headline, core_text, body')
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
          ko: {
            headline: s.headline ?? '',
            coreText: s.core_text ?? '',
            bullets: Array.isArray(bullets) ? bullets : [],
          },
        });
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">다이제스트</h1>
        <Link href="/" className="text-sm underline">
          홈
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          아직 요약된 영상이 없습니다.{' '}
          <Link href="/subscriptions" className="underline">
            채널 구독하기
          </Link>
        </p>
      ) : (
        <div data-testid="feed-list">
          {items.map((it) => (
            <SummaryCard
              key={it.id}
              videoId={it.id}
              mode={mode}
              title={it.title}
              url={it.url}
              ko={it.ko}
            />
          ))}
        </div>
      )}
    </main>
  );
}
