import { describe, it, expect } from 'vitest';
import {
  generateReferralCode,
  isValidReferralCode,
  referralLink,
  REFERRAL_CODE_LENGTH,
} from './code';

describe('generateReferralCode (AC-A1.2 난수 코드)', () => {
  it('정해진 길이의, 혼동 문자 없는 코드', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]+$/);
    expect(code).not.toMatch(/[01OILU]/);
  });

  it('충돌 가능성이 매우 낮다(1000개 유일)', () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateReferralCode()));
    expect(set.size).toBe(1000);
  });
});

describe('isValidReferralCode', () => {
  it('올바른 코드는 통과(대소문자 무관)', () => {
    const code = generateReferralCode();
    expect(isValidReferralCode(code)).toBe(true);
    expect(isValidReferralCode(code.toLowerCase())).toBe(true);
  });

  it('길이·문자 이상은 거부', () => {
    expect(isValidReferralCode('ABC')).toBe(false);
    expect(isValidReferralCode('0000000000')).toBe(false); // 0 은 알파벳에 없음
  });
});

describe('referralLink (AC-A2.1)', () => {
  it('/r/{code} 링크를 만든다(끝 슬래시 정리)', () => {
    expect(referralLink('ABCDE23456', 'https://getkkul.vercel.app')).toBe(
      'https://getkkul.vercel.app/r/ABCDE23456',
    );
    expect(referralLink('ABCDE23456', 'https://getkkul.vercel.app/')).toBe(
      'https://getkkul.vercel.app/r/ABCDE23456',
    );
  });
});
