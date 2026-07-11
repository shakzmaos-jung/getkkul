import { describe, it, expect, vi } from 'vitest';
import { acquireTranscripts } from './acquire';
import type { FetchedContent, VideoRef } from './fetch-content';

/**
 * acquire 시간 예산: 느린 전사 백로그가 잡 전체를 소진해 이후 단계(fillDurations·summarize)가
 * 굶는 것을 막는다. 예산 초과 시 남은 pending 은 건드리지 않고(다음 런 이월) 루프를 중단해야 한다.
 */
function fakeSupabase(pending: { id: string; video_id: string; url: string; retry_count: number }[]) {
  const processedIds: string[] = [];
  const client = {
    from() {
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(col: string, val: string) {
              if (patch.status === 'processing' && col === 'id') processedIds.push(val);
              return Promise.resolve({ error: null });
            },
          };
        },
        select() {
          // eq/or 는 체이닝(임의 개수) 지원, order → limit 에서 결과 반환.
          const chain = {
            eq: () => chain,
            or: () => chain,
            order: () => ({ limit: () => Promise.resolve({ data: pending, error: null }) }),
          };
          return chain;
        },
      };
    },
  };
  return { client, processedIds };
}

const row = (id: string) => ({ id, video_id: `v${id}`, url: `u${id}`, retry_count: 0 });
const ok = async (v: VideoRef): Promise<FetchedContent> => ({
  transcript: `t-${v.videoId}`,
  source: 'caption',
});

describe('acquireTranscripts 시간 예산', () => {
  it('예산을 넘으면 남은 pending 을 처리하지 않고 중단하고 skipped 로 집계한다', async () => {
    const pending = [row('1'), row('2'), row('3'), row('4')];
    const { client, processedIds } = fakeSupabase(pending);
    const fetchContentFn = vi.fn(ok);
    // 시계: start=0, 이후 호출마다 +40ms. budget=100 → 0,40,80 통과(3번째에서 80<100),
    // 다음 체크 120>100 → 중단. 실제로는 2건 처리 후 중단되도록 스텝을 맞춘다.
    let t = 0;
    const now = () => {
      const v = t;
      t += 60;
      return v;
    };

    const r = await acquireTranscripts({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: client as any,
      fetchContentFn,
      budgetMs: 100,
      now,
      sleep: async () => {},
    });

    // start=0(t→60). iter1 check=60<100 → 처리. iter2 check=120>100 → 중단.
    expect(processedIds).toEqual(['1']);
    expect(fetchContentFn).toHaveBeenCalledTimes(1);
    expect(r.done).toBe(1);
    expect(r.skipped).toBe(3);
    expect(r.processed).toBe(1);
  });

  it('예산이 넉넉하면 전부 처리하고 skipped=0', async () => {
    const pending = [row('1'), row('2')];
    const { client, processedIds } = fakeSupabase(pending);
    const r = await acquireTranscripts({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: client as any,
      fetchContentFn: vi.fn(ok),
      budgetMs: 10_000,
      now: () => 0, // 시간 안 흐름
      sleep: async () => {},
    });
    expect(processedIds).toEqual(['1', '2']);
    expect(r.done).toBe(2);
    expect(r.skipped).toBe(0);
  });
});
