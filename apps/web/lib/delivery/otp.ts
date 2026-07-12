import { createHash, randomInt } from 'node:crypto';

/** 수신 이메일 OTP 인증 헬퍼 (사용자 요청 기능). */

export const OTP_TTL_MS = 10 * 60 * 1000; // 10분

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
