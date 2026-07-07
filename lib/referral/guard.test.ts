import { describe, it, expect } from 'vitest';
import { guardGrant } from './guard';

describe('guardGrant (REQ-E 예산·상한 가드)', () => {
  it('여유가 있으면 2,000원 지급', () => {
    expect(guardGrant({ totalIssued: 0, recipientAcquired: 0 })).toEqual({
      grant: true,
      amount: 2000,
      reason: 'ok',
    });
  });

  it('1인 상한 초과 시 미지급 (AC-E1.1)', () => {
    // 이미 48,000 획득 → +2,000 = 50,000 = 상한(허용)
    expect(guardGrant({ totalIssued: 0, recipientAcquired: 48000 }).grant).toBe(true);
    // 49,000 획득 → +2,000 = 51,000 > 상한(차단)
    const r = guardGrant({ totalIssued: 0, recipientAcquired: 49000 });
    expect(r).toEqual({ grant: false, amount: 0, reason: 'per_user_cap' });
  });

  it('예산 킬스위치: 발행 누적이 예산을 넘기게 되면 차단 (AC-E1.2)', () => {
    // 4,998,000 발행 → +2,000 = 5,000,000 = 예산(허용)
    expect(guardGrant({ totalIssued: 4998000, recipientAcquired: 0 }).grant).toBe(true);
    // 4,999,000 발행 → +2,000 = 5,001,000 > 예산(차단, 초과 방지)
    const r = guardGrant({ totalIssued: 4999000, recipientAcquired: 0 });
    expect(r).toEqual({ grant: false, amount: 0, reason: 'budget_cap' });
  });

  it('1인 상한을 예산보다 먼저 판정한다(개별 사유 노출)', () => {
    const r = guardGrant({ totalIssued: 4999000, recipientAcquired: 49000 });
    expect(r.reason).toBe('per_user_cap');
  });
});
