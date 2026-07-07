import { createPipelineClient } from '@/lib/pipeline/supabase';
import { channelFeedUrl, parseChannelFeed } from '@/lib/pipeline/rss';
import { fetchVideoDurations } from '@/lib/youtube/fetch-durations';
import { youtubeCookieHeader } from '@/lib/pipeline/youtube-cookies';

// RSS 요청에 로그인 세션(쿠키)+브라우저 UA 를 붙여 데이터센터 IP 차단(404) 우회 시도.
const RSS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * 신규 영상 감지 (SSR REQ-C1). 구독된 distinct channel_id 의 RSS 를 폴링해
 * videos 에 upsert(status=pending). video_id UNIQUE 로 재등록 방지(AC-C1.2).
 * 개별 채널 실패가 전체를 막지 않는다(H6).
 */
export interface DetectResult {
  channels: number;
  registered: number;
  rssFailures: number; // RSS 요청 실패(404/429/네트워크) 채널 수 — IP 차단·쿠키만료 감지용
}

export async function detectNewVideos(
  deps: { fetchFn?: typeof fetch } = {},
): Promise<DetectResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const supabase = createPipelineClient();

  const { data: subs, error } = await supabase.from('subscriptions').select('channel_id');
  if (error) throw new Error(`구독 조회 실패: ${error.message}`);

  const channelIds = [...new Set((subs ?? []).map((s) => s.channel_id))];
  let registered = 0;
  let rssFailures = 0;
  const insertedIds: string[] = [];

  // 로그인 쿠키를 RSS 요청에 붙인다(IP 차단 우회 시도). 파일 없으면 UA 만.
  const cookie = youtubeCookieHeader();
  const rssHeaders: Record<string, string> = { 'user-agent': RSS_UA };
  if (cookie) rssHeaders.cookie = cookie;
  console.log(`[detect] rss cookie=${cookie ? 'yes' : 'no'}`);

  for (const channelId of channelIds) {
    try {
      const res = await fetchFn(channelFeedUrl(channelId), { headers: rssHeaders });
      if (!res.ok) {
        console.warn(`[detect] RSS ${channelId} → ${res.status}`);
        rssFailures++;
        continue;
      }
      const feed = parseChannelFeed(await res.text());
      if (feed.videos.length === 0) continue;

      const rows = feed.videos.map((v) => ({
        channel_id: channelId,
        video_id: v.videoId,
        title: v.title,
        url: v.url,
        published_at: v.publishedAt || null,
        status: 'pending' as const,
      }));

      // ignoreDuplicates: 이미 있는 video_id 는 건드리지 않고(상태/전사 보존), 새 것만 삽입.
      const { data: inserted, error: upErr } = await supabase
        .from('videos')
        .upsert(rows, { onConflict: 'video_id', ignoreDuplicates: true })
        .select('video_id');
      if (upErr) {
        console.warn(`[detect] upsert ${channelId}: ${upErr.message}`);
        continue;
      }
      registered += inserted?.length ?? 0;
      for (const r of inserted ?? []) insertedIds.push(r.video_id);
    } catch (e) {
      console.warn(`[detect] ${channelId} 실패: ${(e as Error).message}`);
      rssFailures++;
    }
  }

  // 새로 등록된 영상의 길이(초)를 YouTube Data API 로 채운다 (best-effort, 비핵심 데이터).
  if (insertedIds.length > 0) {
    try {
      const durations = await fetchVideoDurations(insertedIds);
      for (const [videoId, sec] of durations) {
        await supabase.from('videos').update({ duration_seconds: sec }).eq('video_id', videoId);
      }
      console.log(`[detect] duration 채움 ${durations.size}/${insertedIds.length}`);
    } catch (e) {
      console.warn(`[detect] duration 채우기 실패: ${(e as Error).message}`);
    }
  }

  return { channels: channelIds.length, registered, rssFailures };
}
