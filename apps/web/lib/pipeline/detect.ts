import { createPipelineClient } from '@/lib/pipeline/supabase';
import { channelFeedUrl, parseChannelFeed, type FeedVideo } from '@/lib/pipeline/rss';
import { fetchVideoDurations } from '@/lib/youtube/fetch-durations';
import { fetchChannelUploads } from '@/lib/youtube/channel-uploads';
import { youtubeCookieHeader } from '@/lib/pipeline/youtube-cookies';
import { CONTENT_CUTOFF_MS } from '@/lib/pipeline/content-cutoff';

// RSS 요청에 로그인 세션(쿠키)+브라우저 UA 를 붙여 데이터센터 IP 차단(404) 우회 시도.
const RSS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * 신규 영상 감지 (SSR REQ-C1). 구독된 distinct channel_id 의 최근 업로드를 폴링해
 * videos 에 upsert(status=pending). video_id UNIQUE 로 재등록 방지(AC-C1.2).
 * 감지 이중화: RSS 우선(무쿼터) → 실패 시 YouTube Data API 폴백(봇차단 없음) → 누락 방지.
 * 개별 채널 실패가 전체를 막지 않는다(H6).
 */
export interface DetectResult {
  channels: number;
  registered: number;
  detectFailures: number; // RSS·API 폴백 모두 실패한 채널 수 — 진짜 감지 불능(알림 대상)
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
  let detectFailures = 0;
  let apiFallbacks = 0;
  let cutoffSkipped = 0; // 멤버십 컷오프(2026-07-10 KST) 이전 업로드 — 비조회라 감지 생략
  const insertedIds: string[] = [];

  // 로그인 쿠키를 RSS 요청에 붙인다(IP 차단 우회 시도). 파일 없으면 UA 만.
  const cookie = youtubeCookieHeader();
  const rssHeaders: Record<string, string> = { 'user-agent': RSS_UA };
  if (cookie) rssHeaders.cookie = cookie;
  console.log(`[detect] rss cookie=${cookie ? 'yes' : 'no'}`);

  for (const channelId of channelIds) {
    // 1) RSS 우선(무쿼터). 실패하면 videos=null 로 두고 API 폴백.
    let videos: FeedVideo[] | null = null;
    try {
      const res = await fetchFn(channelFeedUrl(channelId), { headers: rssHeaders });
      if (res.ok) {
        videos = parseChannelFeed(await res.text()).videos;
      } else {
        console.warn(`[detect] RSS ${channelId} → ${res.status}`);
      }
    } catch (e) {
      console.warn(`[detect] RSS ${channelId} 실패: ${(e as Error).message}`);
    }

    // 2) RSS 실패 → YouTube Data API 폴백(봇차단 없음) → 채널 누락 방지.
    if (videos === null) {
      try {
        videos = await fetchChannelUploads(channelId);
        apiFallbacks++;
        console.log(`[detect] API 폴백 ${channelId}: ${videos.length}개`);
      } catch (e) {
        console.warn(`[detect] API 폴백 ${channelId} 실패: ${(e as Error).message}`);
        detectFailures++; // RSS·API 모두 실패 = 감지 불능
        continue;
      }
    }

    if (videos.length === 0) continue;

    // 멤버십 컷오프 이전(published_at < 2026-07-10 KST) 업로드는 어떤 회원도 못 보므로 감지 생략.
    // published_at 미상(NULL)은 '오래된 것'이 아니므로 통과.
    const rows = videos
      .filter((v) => {
        const keep = !v.publishedAt || Date.parse(v.publishedAt) >= CONTENT_CUTOFF_MS;
        if (!keep) cutoffSkipped++;
        return keep;
      })
      .map((v) => ({
        channel_id: channelId,
        video_id: v.videoId,
        title: v.title,
        url: v.url,
        published_at: v.publishedAt || null,
        status: 'pending' as const,
      }));
    if (rows.length === 0) continue;

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
  }
  if (apiFallbacks > 0) console.log(`[detect] API 폴백 사용 채널=${apiFallbacks}`);
  if (cutoffSkipped > 0) console.log(`[detect] 컷오프 이전(비조회) 감지 생략=${cutoffSkipped}`);

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

  return { channels: channelIds.length, registered, detectFailures };
}
