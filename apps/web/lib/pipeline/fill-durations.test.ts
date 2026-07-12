import { describe, it, expect, vi } from 'vitest';
import { fillMissingDurations } from './fill-durations';

/**
 * fillMissingDurations 는 NULL duration 을 최신 발행순으로 배치 처리해야 한다.
 * (오래된 미충전분이 배치 앞을 막아 백로그가 굶는 회귀 방지 — dur_null 대량 적체 원인.)
 */
type OrderCall = [string, { ascending: boolean; nullsFirst?: boolean }];

function fakeSupabase(nullRows: { video_id: string }[], updates: [Record<string, unknown>, string][]) {
  const orderCalls: OrderCall[] = [];
  let limitArg = 0;
  const selectBuilder = {
    is() {
      return selectBuilder;
    },
    order(col: string, opts: { ascending: boolean; nullsFirst?: boolean }) {
      orderCalls.push([col, opts]);
      return selectBuilder;
    },
    limit(n: number) {
      limitArg = n;
      return Promise.resolve({ data: nullRows });
    },
  };
  const client = {
    from() {
      return {
        select() {
          return selectBuilder;
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(_col: string, val: string) {
              updates.push([patch, val]);
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
  return { client, orderCalls: () => orderCalls, limitArg: () => limitArg };
}

describe('fillMissingDurations', () => {
  it('published_at 내림차순으로, 지정 limit 만큼 조회한다', async () => {
    const rows = [{ video_id: 'v1' }, { video_id: 'v2' }];
    const updates: [Record<string, unknown>, string][] = [];
    const fake = fakeSupabase(rows, updates);
    const fetchDurations = vi.fn(async () => new Map([['v1', 600]])); // v2 는 미충전(라이브/삭제)

    const r = await fillMissingDurations({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: fake.client as any,
      limit: 200,
      fetchDurations,
    });

    expect(fake.orderCalls()[0][0]).toBe('published_at');
    expect(fake.orderCalls()[0][1].ascending).toBe(false);
    expect(fake.limitArg()).toBe(200);
    expect(fetchDurations).toHaveBeenCalledWith(['v1', 'v2']);
    // 충전된 v1 만 업데이트, 미충전 v2 는 건너뜀(NULL 유지 → 다음 런 재시도).
    expect(updates).toEqual([[{ duration_seconds: 600 }, 'v1']]);
    expect(r).toEqual({ filled: 1, targets: 2 });
  });

  it('대상이 없으면 조기 반환', async () => {
    const fake = fakeSupabase([], []);
    const fetchDurations = vi.fn(async () => new Map());
    const r = await fillMissingDurations({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: fake.client as any,
      fetchDurations,
    });
    expect(r).toEqual({ filled: 0, targets: 0 });
    expect(fetchDurations).not.toHaveBeenCalled();
  });
});
