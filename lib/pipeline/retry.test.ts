import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

const noSleep = async () => {};

describe('withRetry (AC-C2.4 지수 백오프)', () => {
  it('성공하면 즉시 반환하고 재시도하지 않는다', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('중간에 실패해도 재시도 후 성공하면 값을 반환한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('최대 시도(3회) 모두 실패하면 마지막 에러를 던진다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(fn, { attempts: 3, baseMs: 1, sleep: noSleep })).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('지수 백오프 간격으로 sleep 한다 (base, base*2)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'));
    const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
    await expect(withRetry(fn, { attempts: 3, baseMs: 100, sleep })).rejects.toThrow();
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([100, 200]); // 마지막 시도 후엔 sleep 안 함
  });
});
