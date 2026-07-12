import { describe, it, expect } from 'vitest';
import {
  generateOtp,
  hashOtp,
  isValidEmail,
  isOtpCooldownActive,
  nextOtpAttemptState,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from './otp';

describe('otp helpers', () => {
  it('generateOtp 는 6자리 숫자', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it('hashOtp 는 결정적이고 공백을 무시한다', () => {
    expect(hashOtp('123456')).toBe(hashOtp(' 123456 '));
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
    expect(hashOtp('123456')).toHaveLength(64); // sha256 hex
  });

  it('isValidEmail', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('user.name@example.co.kr')).toBe(true);
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
});

describe('OTP 남용 방지 (8a/8b)', () => {
  const now = 1_000_000_000_000;

  it('isOtpCooldownActive: 쿨다운 이내면 차단, 지나면 허용, 값 없으면 허용', () => {
    expect(isOtpCooldownActive(null, now)).toBe(false);
    expect(isOtpCooldownActive(undefined, now)).toBe(false);
    // 방금 요청(0초 경과) → 차단
    expect(isOtpCooldownActive(new Date(now).toISOString(), now)).toBe(true);
    // 쿨다운 직전(경계 1ms 이내) → 차단
    expect(isOtpCooldownActive(new Date(now - OTP_COOLDOWN_MS + 1).toISOString(), now)).toBe(true);
    // 쿨다운 경과 → 허용
    expect(isOtpCooldownActive(new Date(now - OTP_COOLDOWN_MS).toISOString(), now)).toBe(false);
    expect(isOtpCooldownActive(new Date(now - OTP_COOLDOWN_MS - 1).toISOString(), now)).toBe(false);
  });

  it('nextOtpAttemptState: 상한 미만은 계속, 상한 도달 시 exhausted', () => {
    expect(nextOtpAttemptState(0)).toEqual({ attempts: 1, exhausted: false });
    expect(nextOtpAttemptState(OTP_MAX_ATTEMPTS - 2)).toEqual({
      attempts: OTP_MAX_ATTEMPTS - 1,
      exhausted: false,
    });
    // (MAX-1) 번째 실패 → attempts=MAX → exhausted
    expect(nextOtpAttemptState(OTP_MAX_ATTEMPTS - 1)).toEqual({
      attempts: OTP_MAX_ATTEMPTS,
      exhausted: true,
    });
  });
});
