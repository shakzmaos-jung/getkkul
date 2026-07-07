import { randomBytes } from 'node:crypto';

/**
 * 추천 코드 생성 (REQ-A1). 전역 고유·추측 곤란한 난수(AC-A1.2).
 * 사용자당 정확히 1개(최초 필요 시 생성 후 고정, AC-A1.1)는 저장 계층(UNIQUE + get-or-create)에서 보장한다.
 * 혼동 문자(0/O, 1/I/L)를 뺀 Crockford 계열 알파벳으로 URL·구두 전달에 안전하게.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'; // 30자, 0/1/O/I/L/U 제외
export const REFERRAL_CODE_LENGTH = 10;

/** 암호학적 난수로 코드 1개를 만든다. */
export function generateReferralCode(length = REFERRAL_CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** 링크/입력에서 받은 코드 형식 검증(정규화 대문자). 잘못된 문자는 무효. */
export function isValidReferralCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`).test(code.toUpperCase());
}

/** 코드로 추천 링크를 만든다(AC-A2.1). */
export function referralLink(code: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/r/${code}`;
}
