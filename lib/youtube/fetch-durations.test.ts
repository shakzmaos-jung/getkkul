import { describe, it, expect, vi } from 'vitest';
import { fetchVideoDurations } from './fetch-durations';

function fakeFetch(byId: Record<string, string>) {
  return vi.fn(async (url: RequestInfo | URL) => {
    const ids = new URL(url as URL).searchParams.get('id')!.split(',');
    const items = ids
      .filter((id) => byId[id] != null)
      .map((id) => ({ id, contentDetails: { duration: byId[id] } }));
    return { ok: true, json: async () => ({ items }) } as Response;
  });
}

describe('fetchVideoDurations', () => {
  it('id별 길이(초) 맵을 반환하고 파싱 불가/없음은 제외', async () => {
    const fetchFn = fakeFetch({ a: 'PT12M34S', b: 'PT1H', c: 'P0D' });
    const out = await fetchVideoDurations(['a', 'b', 'c', 'd'], { fetchFn, apiKey: 'k' });
    expect(out.get('a')).toBe(754);
    expect(out.get('b')).toBe(3600);
    expect(out.has('c')).toBe(false); // P0D → null
    expect(out.has('d')).toBe(false); // 응답 없음
  });

  it('50개 초과는 50개씩 배치 호출', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);
    const byId = Object.fromEntries(ids.map((id) => [id, 'PT1M']));
    const fetchFn = fakeFetch(byId);
    const out = await fetchVideoDurations(ids, { fetchFn, apiKey: 'k' });
    expect(fetchFn).toHaveBeenCalledTimes(3); // 50 + 50 + 20
    expect(out.size).toBe(120);
    expect(out.get('v0')).toBe(60);
  });

  it('빈 목록·키 없음이면 호출 없이 빈 맵', async () => {
    const fetchFn = fakeFetch({});
    expect((await fetchVideoDurations([], { fetchFn, apiKey: 'k' })).size).toBe(0);
    expect((await fetchVideoDurations(['a'], { fetchFn, apiKey: undefined })).size).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
