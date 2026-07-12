import { describe, it, expect } from 'vitest';
import { generateOtp, hashOtp, isValidEmail } from './otp';

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
