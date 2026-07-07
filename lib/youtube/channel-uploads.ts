import type { FeedVideo } from '@/lib/pipeline/rss';

/**
 * RSS 폴백: YouTube Data API(playlistItems, 채널 업로드 재생목록)로 최근 업로드를 조회한다.
 * Data API 는 키 인증이라 데이터센터 IP 봇차단(RSS 404)을 받지 않아 감지 이중화 경로가 된다.
 * 업로드 재생목록 ID = 채널 ID 의 UC 접두 → UU. 키 없음/HTTP 실패는 throw(호출자가 감지 실패로 집계).
 */
export async function fetchChannelUploads(
  channelId: string,
  deps: { fetchFn?: typeof fetch; apiKey?: string } = {},
): Promise<FeedVideo[]> {
  const key = 'apiKey' in deps ? deps.apiKey : process.env.YOUTUBE_API_KEY;
  const fetchFn = deps.fetchFn ?? fetch;
  if (!key) throw new Error('YOUTUBE_API_KEY 미설정');
  if (!channelId.startsWith('UC')) throw new Error(`업로드 재생목록 미지원 채널 ID: ${channelId}`);

  const uploadsPlaylist = `UU${channelId.slice(2)}`;
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
  url.searchParams.set('part', 'snippet,contentDetails');
  url.searchParams.set('playlistId', uploadsPlaylist);
  url.searchParams.set('maxResults', '15');
  url.searchParams.set('key', key);

  const res = await fetchFn(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`playlistItems ${res.status}`);
  const data = (await res.json()) as {
    items?: Array<{
      snippet?: { title?: string; publishedAt?: string };
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
    }>;
  };

  const out: FeedVideo[] = [];
  for (const it of data.items ?? []) {
    const videoId = it.contentDetails?.videoId;
    if (!videoId) continue;
    out.push({
      videoId,
      title: it.snippet?.title ?? '',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? '',
    });
  }
  return out;
}
