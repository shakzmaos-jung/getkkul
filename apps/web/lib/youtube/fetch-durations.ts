import { parseIso8601Duration } from './duration';

/**
 * video_id 목록의 길이(초)를 YouTube Data API(videos.list, part=contentDetails)로 조회.
 * - 최대 50개/호출로 배치(API 상한).
 * - best-effort: 키 없음·HTTP 실패·파싱 불가·라이브(P0D)는 결과 맵에서 빠진다(길이는 비핵심 데이터).
 * 서버 전용(파이프라인·백필에서 호출). 상위는 이 인터페이스만 안다.
 */
export async function fetchVideoDurations(
  videoIds: string[],
  deps: { fetchFn?: typeof fetch; apiKey?: string } = {},
): Promise<Map<string, number>> {
  const key = 'apiKey' in deps ? deps.apiKey : process.env.YOUTUBE_API_KEY;
  const fetchFn = deps.fetchFn ?? fetch;
  const out = new Map<string, number>();
  if (!key || videoIds.length === 0) return out;

  const uniq = [...new Set(videoIds)];
  for (let i = 0; i < uniq.length; i += 50) {
    const batch = uniq.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', key);
    try {
      const res = await fetchFn(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        items?: { id: string; contentDetails?: { duration?: string } }[];
      };
      for (const it of data.items ?? []) {
        const sec = parseIso8601Duration(it.contentDetails?.duration);
        if (sec != null) out.set(it.id, sec);
      }
    } catch {
      // best-effort: 이 배치는 건너뛴다.
    }
  }
  return out;
}
