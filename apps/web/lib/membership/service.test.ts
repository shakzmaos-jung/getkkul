import { describe, it, expect } from 'vitest';
import { freshMembershipValues, computeProration } from './period';

describe('freshMembershipValues', () => {
  it('오늘 KST 기준 anchor·주기·다음결제 계산', () => {
    // 2026-07-09T15:00Z = 2026-07-10 00:00 KST
    const v = freshMembershipValues(new Date('2026-07-10T05:00:00Z')); // KST 14:00 7/10
    expect(v.anchor).toBe(10);
    expect(v.periodStart).toBe('2026-07-10');
    expect(v.periodEnd).toBe('2026-08-10');
    expect(v.nextBillingAt).toBe('2026-08-09T15:00:00.000Z'); // 8/10 00:00 KST
  });
  it('월말 가입(1/31)도 anchor 31, 다음 2/28', () => {
    const v = freshMembershipValues(new Date('2026-01-31T05:00:00Z'));
    expect(v.anchor).toBe(31);
    expect(v.periodEnd).toBe('2026-02-28');
  });
});

describe('computeProration (업그레이드 미리보기)', () => {
  it('주기 중반 small→large: 남은일수 비율 차액(정가) + 무PG 청구 0', () => {
    // 주기 7/10~8/10(31일), now 7/25 00:00 KST(=7/24T15:00Z) → 남은 16일
    const p = computeProration('small', 'large', '2026-07-10', 10, new Date('2026-07-24T15:00:00Z'));
    expect(p.periodDays).toBe(31);
    expect(p.remainingDays).toBe(16);
    expect(p.raw).toBe(1032); // round(2000*16/31)
    expect(p.charge).toBe(0); // 무PG 100% 할인
  });
});
