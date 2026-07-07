import { describe, it, expect } from 'vitest';
import { isSelfReferral, abuseDecision } from './abuse';

describe('isSelfReferral (AC-I1.4)', () => {
  it('같은 사용자면 자기추천', () => {
    expect(isSelfReferral('u1', 'u1')).toBe(true);
    expect(isSelfReferral('u1', 'u2')).toBe(false);
  });
});

describe('abuseDecision (REQ-I)', () => {
  it('일반 케이스는 허용', () => {
    expect(abuseDecision({})).toEqual({ allow: true, reason: 'ok' });
  });

  it('자기추천은 차단 (AC-I1.4)', () => {
    expect(abuseDecision({ selfReferral: true })).toEqual({
      allow: false,
      reason: 'self_referral',
    });
  });

  it('재가입(보상 이력 있는 해시)은 차단 (AC-I1.2)', () => {
    expect(abuseDecision({ rewardedBefore: true })).toEqual({
      allow: false,
      reason: 'rewarded_before',
    });
  });
});
