import { createHash, randomInt } from 'node:crypto';

/** 수신 이메일 OTP 인증 헬퍼 (사용자 요청 기능). */

export const OTP_TTL_MS = 10 * 60 * 1000; // 10분

/** 재요청 쿨다운(보안 8b): 임의 주소로의 인증메일 폭탄을 막는다. */
export const OTP_COOLDOWN_MS = 60 * 1000; // 60초

/** 검증 시도 상한(보안 8a): 초과 시 pending 무효화 → 6자리 코드 브루트포스 차단. */
export const OTP_MAX_ATTEMPTS = 5;

/** 6자리 숫자 OTP (crypto 기반). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** OTP 를 sha256 해시로 저장(평문 저장 금지). */
export function hashOtp(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

/** 간단한 이메일 형식 검증. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 마지막 요청이 쿨다운 이내인지(true 면 재요청 차단, 8b). requestedAt 없으면 허용. */
export function isOtpCooldownActive(
  requestedAtIso: string | null | undefined,
  nowMs: number,
): boolean {
  if (!requestedAtIso) return false;
  return nowMs - new Date(requestedAtIso).getTime() < OTP_COOLDOWN_MS;
}

/** 검증 실패 시 다음 시도 상태(8a). exhausted 면 pending 을 무효화해야 한다. */
export function nextOtpAttemptState(currentAttempts: number): {
  attempts: number;
  exhausted: boolean;
} {
  const attempts = (currentAttempts ?? 0) + 1;
  return { attempts, exhausted: attempts >= OTP_MAX_ATTEMPTS };
}
