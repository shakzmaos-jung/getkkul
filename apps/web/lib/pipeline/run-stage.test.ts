import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runStage } from './run-stage';

describe('runStage — 단계 격리 (H6)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('성공 시 결과를 그대로 반환하고 failures 를 건드리지 않는다', async () => {
    const failures: string[] = [];
    const r = await runStage('detect', async () => ({ registered: 3 }), { registered: 0 }, failures);
    expect(r).toEqual({ registered: 3 });
    expect(failures).toEqual([]);
  });

  it('예외 시 fallback 을 반환하고 실패 단계를 기록한다', async () => {
    const failures: string[] = [];
    const r = await runStage(
      'acquire',
      async () => {
        throw new Error('pending 조회 실패');
      },
      { processed: 0, done: 0 },
      failures,
    );
    expect(r).toEqual({ processed: 0, done: 0 });
    expect(failures).toEqual(['acquire']);
  });

  it('한 단계 실패가 후속 단계 실행을 막지 않는다 (acquire 실패 → summarize 계속)', async () => {
    const failures: string[] = [];
    const summarize = vi.fn(async () => ({ videos: 2, generated: 2 }));

    const acq = await runStage(
      'acquire',
      async () => {
        throw new Error('boom');
      },
      { processed: 0, done: 0 },
      failures,
    );
    const sum = await runStage('summarize', summarize, { videos: 0, generated: 0 }, failures);

    expect(acq).toEqual({ processed: 0, done: 0 }); // 격리된 실패
    expect(summarize).toHaveBeenCalledTimes(1); // 후속 단계가 실제로 실행됨
    expect(sum).toEqual({ videos: 2, generated: 2 });
    expect(failures).toEqual(['acquire']); // summarize 는 성공
  });
});
