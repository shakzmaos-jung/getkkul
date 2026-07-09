/**
 * 채널 검색 (channel-search spec §B/C). 로컬 카탈로그 → 캐시 → YouTube API 순으로 해결해
 * search.list(100유닛/호출)의 쿼터 소비를 최소화하고 감지 쿼터를 보호한다.
 * 오케스트레이터(resolveChannelSearch)는 IO 를 주입받아 순수 로직으로 테스트 가능하다.
 */

export interface ChannelCandidate {
  channelId: string;
  title: string;
  thumbnail: string | null;
  handle: string | null;
}

/** search.list 1회 유닛(감지 대비 100배). */
export const SEARCH_UNITS = 100;
/** 검색 최소 글자수(AC-C1.2). */
export const MIN_QUERY_CHARS = 2;
/** 로컬 카탈로그가 이 개수 이상이면 API 미호출(AC-B1.1). */
export const SUFFICIENT_LOCAL = 5;

/** 검색어 정규화: 소문자 + 공백 정리(캐시 적중률↑, AC-E2). */
export function normalizeQuery(q: string): string {
  return (q ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 검색 전용 API 키(향후 물리 격리 대비). 없으면 감지와 동일 키로 폴백(AC-C2.3). */
export function searchApiKey(): string | undefined {
  return process.env.YOUTUBE_SEARCH_API_KEY ?? process.env.YOUTUBE_API_KEY;
}

/** channelId 기준 중복 제거(로컬 우선). */
export function mergeDedupe(...lists: ChannelCandidate[][]): ChannelCandidate[] {
  const seen = new Set<string>();
  const out: ChannelCandidate[] = [];
  for (const list of lists) {
    for (const c of list) {
      if (c.channelId && !seen.has(c.channelId)) {
        seen.add(c.channelId);
        out.push(c);
      }
    }
  }
  return out;
}

interface YtThumbs {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
}
function pickThumb(t?: YtThumbs): string | null {
  return t?.medium?.url ?? t?.default?.url ?? t?.high?.url ?? null;
}

/** YouTube Data API search.list(type=channel) 호출. 100유닛. */
export async function searchChannelsApi(
  query: string,
  deps: { apiKey?: string; fetchFn?: typeof fetch; maxResults?: number } = {},
): Promise<ChannelCandidate[]> {
  const key = deps.apiKey ?? searchApiKey();
  const fetchFn = deps.fetchFn ?? fetch;
  if (!key) throw new Error('YOUTUBE_API_KEY 미설정');

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'channel');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(deps.maxResults ?? 8));
  url.searchParams.set('key', key);

  const res = await fetchFn(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = (await res.json()) as {
    items?: Array<{ id?: { channelId?: string }; snippet?: { title?: string; thumbnails?: YtThumbs } }>;
  };
  const out: ChannelCandidate[] = [];
  for (const it of data.items ?? []) {
    const channelId = it.id?.channelId;
    if (!channelId) continue;
    out.push({
      channelId,
      title: it.snippet?.title ?? '',
      thumbnail: pickThumb(it.snippet?.thumbnails),
      handle: null, // search.list 는 핸들 미제공(저장 시 channels.list 로 보강)
    });
  }
  return out;
}

export type SearchSource = 'none' | 'local' | 'cache' | 'api' | 'capped';
export interface SearchOutcome {
  candidates: ChannelCandidate[];
  source: SearchSource;
  capped: boolean; // 상한 도달로 API 미호출
}

export interface SearchDeps {
  loadCatalog: (qNorm: string) => Promise<ChannelCandidate[]>;
  loadCache: (qNorm: string) => Promise<ChannelCandidate[] | null>; // null = 미적중/만료
  apiSearch: (query: string) => Promise<ChannelCandidate[]>;
  saveCache: (qNorm: string, results: ChannelCandidate[]) => Promise<void>;
  consumeUnits: (units: number) => Promise<boolean>; // true = 상한 내(허용)
  minChars?: number;
  sufficientLocal?: number;
}

/**
 * 소스 우선순위 오케스트레이션(REQ-B/C):
 * 1) 최소 글자수 미달 → 빈 결과(API 미호출).
 * 2) 로컬 카탈로그 충분 → 로컬(API 미호출, AC-B1.1).
 * 3) 유효 캐시 → 캐시(API 미호출, AC-B1.2).
 * 4) 그 외 → 상한 여유 시에만 API 호출·캐시 저장(AC-B1.3/C2.1). 상한 초과면 로컬만(capped).
 */
export async function resolveChannelSearch(
  rawQuery: string,
  deps: SearchDeps,
): Promise<SearchOutcome> {
  const qNorm = normalizeQuery(rawQuery);
  const minChars = deps.minChars ?? MIN_QUERY_CHARS;
  if (qNorm.length < minChars) return { candidates: [], source: 'none', capped: false };

  const local = await deps.loadCatalog(qNorm);
  if (local.length >= (deps.sufficientLocal ?? SUFFICIENT_LOCAL)) {
    return { candidates: local, source: 'local', capped: false };
  }

  const cache = await deps.loadCache(qNorm);
  if (cache) {
    return { candidates: mergeDedupe(local, cache), source: 'cache', capped: false };
  }

  const allowed = await deps.consumeUnits(SEARCH_UNITS);
  if (!allowed) {
    // 상한 도달 → API 중단, 로컬만 제공(감지 쿼터 미침범, AC-C2.1).
    return { candidates: local, source: 'capped', capped: true };
  }

  const api = await deps.apiSearch(qNorm);
  await deps.saveCache(qNorm, api);
  return { candidates: mergeDedupe(local, api), source: 'api', capped: false };
}
