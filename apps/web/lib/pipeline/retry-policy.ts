/**
 * 전사 실패 재시도 정책 (pipeline-reliability spec REQ-B).
 * 일시 실패(봇차단·네트워크·타임아웃)는 감쇠 백오프로 재시도하고, 영구 실패(삭제·비공개 등
 * 판별 가능한 사유)나 최대 재시도 초과는 종점 failed 로 확정한다. 순수 함수 — TDD 테스트 원천.
 */

export type FailureKind = 'transient' | 'permanent';

/** 최대 재시도 횟수(이후 종점 failed). */
export const MAX_RETRIES = 6;
const BASE_BACKOFF_MIN = 30; // 첫 재시도 30분
const MAX_BACKOFF_MIN = 6 * 60; // 상한 6시간

/** 재시도 백오프(분): 30 · 60 · 120 · 240 · 360(상한) · 360 … */
export function backoffMinutes(retryCount: number): number {
  const m = BASE_BACKOFF_MIN * 2 ** Math.max(0, retryCount - 1);
  return Math.min(m, MAX_BACKOFF_MIN);
}

/** retryCount 번째 재시도의 다음 시각(ISO). */
export function nextRetryAtIso(retryCount: number, nowIso: string): string {
  const at = new Date(nowIso).getTime() + backoffMinutes(retryCount) * 60_000;
  return new Date(at).toISOString();
}

// 판별 가능한 "영구 실패" 사유(삭제·비공개·차단 등). 그 외는 일시로 간주해 재시도한다.
const PERMANENT_PATTERNS: RegExp[] = [
  /video unavailable/i,
  /private video/i,
  /this video (has been|is no longer|is not) /i,
  /removed by the (uploader|user)/i,
  /members[- ]only/i,
  /account (associated|has been terminated)/i,
  /no longer available/i,
  /this video is unavailable/i,
  /deleted video/i,
  // 오디오가 Whisper 25MB 한도를 초과(초장편). 재시도해도 동일 크기 → 종점화(무한 재시도 방지).
  /maximum content size/i, // Whisper API 413 본문
  /audio too large/i, // whisperAudio 의 사전 크기 가드
];

/** 실패 원인 분류. 명확한 영구 사유면 'permanent', 그 외(봇차단·429·네트워크·타임아웃)는 'transient'. */
export function classifyFailure(errorMessage: string): FailureKind {
  const msg = errorMessage ?? '';
  return PERMANENT_PATTERNS.some((re) => re.test(msg)) ? 'permanent' : 'transient';
}

export interface RetryState {
  retry_count: number;
  next_retry_at: string | null;
  failure_kind: FailureKind | null;
}

/**
 * 재시도 대상 자격: 영구 실패가 아니고, 최대 미만이며, next_retry_at 이 도래(또는 없음).
 * (acquire 는 status='pending' + 이 조건으로 후보를 고른다.)
 */
export function shouldRetry(s: RetryState, nowIso: string, maxRetries = MAX_RETRIES): boolean {
  if (s.failure_kind === 'permanent') return false;
  if (s.retry_count >= maxRetries) return false;
  if (s.next_retry_at && new Date(s.next_retry_at).getTime() > new Date(nowIso).getTime()) {
    return false;
  }
  return true;
}

export interface FailurePlan {
  status: 'pending' | 'failed';
  retry_count: number;
  failure_kind: FailureKind;
  next_retry_at: string | null;
  last_error: string;
}

/**
 * 실패 1건에 대한 처리 결정.
 * - 영구 사유 또는 최대 재시도 도달 → 종점 'failed'(next_retry_at 없음).
 * - 그 외 일시 실패 → 'pending' 으로 되돌리고 백오프 next_retry_at 설정(재큐).
 */
export function planFailure(
  currentRetryCount: number,
  errorMessage: string,
  nowIso: string,
  maxRetries = MAX_RETRIES,
): FailurePlan {
  const kind = classifyFailure(errorMessage);
  const retry_count = currentRetryCount + 1;
  const last_error = (errorMessage ?? '').slice(0, 500);

  if (kind === 'permanent' || retry_count >= maxRetries) {
    return { status: 'failed', retry_count, failure_kind: kind, next_retry_at: null, last_error };
  }
  return {
    status: 'pending',
    retry_count,
    failure_kind: 'transient',
    next_retry_at: nextRetryAtIso(retry_count, nowIso),
    last_error,
  };
}
