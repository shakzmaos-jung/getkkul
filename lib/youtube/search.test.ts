import { describe, it, expect, vi } from 'vitest';
import {
  normalizeQuery,
  mergeDedupe,
  resolveChannelSearch,
  searchChannelsApi,
  type ChannelCandidate,
  type SearchDeps,
} from './search';

const cand = (id: string, title = id): ChannelCandidate => ({
  channelId: id,
  title,
  thumbnail: null,
  handle: null,
});

function deps(over: Partial<SearchDeps> = {}): SearchDeps {
  return {
    loadCatalog: vi.fn(async () => []),
    loadCache: vi.fn(async () => null),
    apiSearch: vi.fn(async () => [cand('api1')]),
    saveCache: vi.fn(async () => {}),
    consumeUnits: vi.fn(async () => true),
    ...over,
  };
}

describe('normalizeQuery (AC-E2)', () => {
  it('소문자 + 공백 정리', () => {
    expect(normalizeQuery('  Hello   World ')).toBe('hello world');
  });
});

describe('mergeDedupe', () => {
  it('channelId 중복 제거(로컬 우선 순서 유지)', () => {
    expect(mergeDedupe([cand('a'), cand('b')], [cand('b'), cand('c')]).map((c) => c.channelId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('resolveChannelSearch 소스 우선순위 (REQ-B/C)', () => {
  it('최소 글자수 미달 → 빈 결과, API 미호출 (AC-C1.2)', async () => {
    const d = deps();
    const r = await resolveChannelSearch('a', d);
    expect(r.candidates).toEqual([]);
    expect(r.source).toBe('none');
    expect(d.apiSearch).not.toHaveBeenCalled();
    expect(d.consumeUnits).not.toHaveBeenCalled();
  });

  it('로컬 충분 → 로컬 반환, API·유닛 미소비 (AC-B1.1, S1)', async () => {
    const local = [cand('l1'), cand('l2'), cand('l3'), cand('l4'), cand('l5')];
    const d = deps({ loadCatalog: vi.fn(async () => local) });
    const r = await resolveChannelSearch('뉴스', d);
    expect(r.source).toBe('local');
    expect(r.candidates).toHaveLength(5);
    expect(d.loadCache).not.toHaveBeenCalled();
    expect(d.apiSearch).not.toHaveBeenCalled();
    expect(d.consumeUnits).not.toHaveBeenCalled();
  });

  it('로컬 부족 + 캐시 적중 → 캐시(로컬 병합), API 미호출 (AC-B1.2, S2)', async () => {
    const d = deps({
      loadCatalog: vi.fn(async () => [cand('l1')]),
      loadCache: vi.fn(async () => [cand('c1'), cand('c2')]),
    });
    const r = await resolveChannelSearch('주식', d);
    expect(r.source).toBe('cache');
    expect(r.candidates.map((c) => c.channelId)).toEqual(['l1', 'c1', 'c2']);
    expect(d.apiSearch).not.toHaveBeenCalled();
    expect(d.consumeUnits).not.toHaveBeenCalled();
  });

  it('로컬·캐시 부족 → API 호출 + 캐시 저장 (AC-B1.3/B1.4, S3)', async () => {
    const saveCache = vi.fn(async () => {});
    const d = deps({ apiSearch: vi.fn(async () => [cand('a1'), cand('a2')]), saveCache });
    const r = await resolveChannelSearch('신규채널', d);
    expect(r.source).toBe('api');
    expect(d.consumeUnits).toHaveBeenCalledWith(100);
    expect(d.apiSearch).toHaveBeenCalledOnce();
    expect(saveCache).toHaveBeenCalledOnce();
    expect(r.candidates.map((c) => c.channelId)).toEqual(['a1', 'a2']);
  });

  it('상한 도달 → API 중단, 로컬만 제공(capped), 감지 쿼터 미침범 (AC-C2.1, S5)', async () => {
    const d = deps({
      loadCatalog: vi.fn(async () => [cand('l1')]),
      consumeUnits: vi.fn(async () => false), // 상한 초과
    });
    const r = await resolveChannelSearch('뭔가', d);
    expect(r.source).toBe('capped');
    expect(r.capped).toBe(true);
    expect(r.candidates.map((c) => c.channelId)).toEqual(['l1']);
    expect(d.apiSearch).not.toHaveBeenCalled();
  });
});

describe('searchChannelsApi (search.list 매핑)', () => {
  it('type=channel·q·maxResults 로 호출, id.channelId 매핑', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => ({
      ok: true,
      json: async () => ({
        items: [
          { id: { channelId: 'UC1' }, snippet: { title: '채널1', thumbnails: { medium: { url: 't1' } } } },
          { id: {}, snippet: { title: '무효' } }, // channelId 없음 → 제외
        ],
      }),
    }) as unknown as Response);
    const out = await searchChannelsApi('뉴스', { apiKey: 'k', fetchFn });
    expect(out).toEqual([{ channelId: 'UC1', title: '채널1', thumbnail: 't1', handle: null }]);
    const url = new URL(String(fetchFn.mock.calls[0][0]));
    expect(url.searchParams.get('type')).toBe('channel');
    expect(url.searchParams.get('q')).toBe('뉴스');
  });
});
