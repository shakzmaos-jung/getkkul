import { describe, it, expect } from 'vitest';
import { chunk, selectSummarizedRows, toDigestDates } from './digests';

describe('chunk (PostgREST .in() URL 한계 회피)', () => {
  it('size 단위로 분할하며 나머지를 마지막 청크에 담는다', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('빈 배열은 빈 결과', () => {
    expect(chunk([], 100)).toEqual([]);
  });
  it('size 가 길이 이상이면 단일 청크', () => {
    expect(chunk([1, 2], 100)).toEqual([[1, 2]]);
  });
});

type Row = { id: string; channel_id: string; published_at: string | null };

const row = (id: string, channel = 'c1', published: string | null = '2026-07-10T00:00:00Z'): Row => ({
  id,
  channel_id: channel,
  published_at: published,
});

describe('selectSummarizedRows', () => {
  it('요약 없는 done 영상은 제외한다 (calendar/card 불일치 원인 제거)', () => {
    const rows = [row('a'), row('b'), row('c')];
    const has = new Set(['a', 'c']);
    expect(selectSummarizedRows(rows, (id) => has.has(id), 50).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('상한을 적용하고 입력 순서(최신순)를 유지한다', () => {
    const rows = [row('a'), row('b'), row('c'), row('d')];
    expect(selectSummarizedRows(rows, () => true, 2).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('toDigestDates', () => {
  const kst = (iso: string) => iso.slice(0, 10); // 테스트용 단순 변환

  it('published_at 이 없으면 건너뛴다', () => {
    const rows = [row('a', 'c1', '2026-07-10T00:00:00Z'), row('b', 'c1', null)];
    expect(toDigestDates(rows, kst)).toEqual([{ c: 'c1', d: '2026-07-10' }]);
  });

  it('캘린더 일자별 집계가 선별된 카드 집합과 1:1로 일치한다 (동일 소스 불변식)', () => {
    const rows = [row('a'), row('b'), row('c')];
    const has = new Set(['a', 'b']); // c 는 요약 없음
    const selected = selectSummarizedRows(rows, (id) => has.has(id), 50);
    const dates = toDigestDates(selected, kst);
    // 선별된 카드 수 === 캘린더 집계 총합
    expect(dates.length).toBe(selected.length);
    const perDate = dates.reduce<Record<string, number>>((m, { d }) => {
      m[d] = (m[d] ?? 0) + 1;
      return m;
    }, {});
    expect(perDate['2026-07-10']).toBe(2);
  });
});
