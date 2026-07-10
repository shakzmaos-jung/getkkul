/**
 * 지수 백오프 재시도 (SSR AC-C2.4: 최대 3회 후 실패 처리).
 * sleep 을 주입 가능하게 해 테스트에서 지연 없이 검증한다.
 */
export interface RetryOptions {
  attempts: number; // 총 시도 횟수
  baseMs: number; // 백오프 기준 (baseMs * 2^i)
  sleep?: (ms: number) => Promise<void>;
  // false 를 반환하면 재시도하지 않고 즉시 던진다(영구 실패는 재시도가 낭비 — 예: 오디오 초과).
  shouldRetry?: (err: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  let lastErr: unknown;

  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (opts.shouldRetry && !opts.shouldRetry(e)) throw e; // 영구 실패 → 즉시 중단
      if (i < opts.attempts - 1) {
        await sleep(opts.baseMs * 2 ** i);
      }
    }
  }
  throw lastErr;
}
