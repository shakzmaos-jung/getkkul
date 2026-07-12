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
  const data = (await res.json()) as { items?: PlaylistItem[] };
  return mapPlaylistItems(data.items ?? []);
}

interface PlaylistItem {
  snippet?: { title?: string; publishedAt?: string };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
}

function mapPlaylistItems(items: PlaylistItem[]): FeedVideo[] {
  const out: FeedVideo[] = [];
  for (const it of items) {
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

/**
 * 업로드 재생목록을 pageToken 으로 여러 페이지 조회한다(백필, REQ-E). 15개 창 너머의
 * 누락분을 회복하기 위해 maxPages × 50개까지 훑는다. 각 페이지 50개, nextPageToken 소진 시 중단.
 */
export async function fetchChannelUploadsPaged(
  channelId: string,
  maxPages: number,
  deps: { fetchFn?: typeof fetch; apiKey?: string } = {},
): Promise<FeedVideo[]> {
  const key = 'apiKey' in deps ? deps.apiKey : process.env.YOUTUBE_API_KEY;
  const fetchFn = deps.fetchFn ?? fetch;
  if (!key) throw new Error('YOUTUBE_API_KEY 미설정');
  if (!channelId.startsWith('UC')) throw new Error(`업로드 재생목록 미지원 채널 ID: ${channelId}`);

  const uploadsPlaylist = `UU${channelId.slice(2)}`;
  const out: FeedVideo[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('playlistId', uploadsPlaylist);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', key);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetchFn(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`playlistItems ${res.status}`);
    const data = (await res.json()) as { items?: PlaylistItem[]; nextPageToken?: string };
    out.push(...mapPlaylistItems(data.items ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}
