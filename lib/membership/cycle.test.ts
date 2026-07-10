import { describe, it, expect } from 'vitest';
import { planNextCycle, type MembershipState } from './cycle';

const base: MembershipState = {
  planCode: 'medium',
  status: 'poc_free',
  anchorDay: 10,
  periodStart: '2026-07-10',
  periodEnd: '2026-08-10',
  nextBillingAt: '2026-08-09T15:00:00.000Z', // 8/10 00:00 KST
  scheduledChange: null,
  graceUntil: null,
  pocFreeUntil: '2026-09-30T14:59:59.000Z', // 9/30 23:59:59 KST
};

describe('planNextCycle', () => {
  it('아무 트리거 없으면 none', () => {
    expect(planNextCycle(base, new Date('2026-07-20T00:00:00Z')).type).toBe('none');
  });

  it('S9 — PoC 종료 경계에서 active 전환(무PG 0원, Medium 유지)', () => {
    // 9/30 시점의 실제 상태: 이미 9/10 롤오버되어 다음 결제 10/10. 롤오버는 아직 안 됨.
    const m = { ...base, periodStart: '2026-09-10', periodEnd: '2026-10-10', nextBillingAt: '2026-10-09T15:00:00.000Z' };
    // 9/30 23:59:58 KST → 아직 PoC
    expect(planNextCycle(m, new Date('2026-09-30T14:59:58Z')).type).toBe('none');
    // 9/30 23:59:59 KST → 종료
    const a = planNextCycle(m, new Date('2026-09-30T14:59:59Z'));
    expect(a).toMatchObject({ type: 'poc_end', newPlan: 'medium', newStatus: 'active', clearPoc: true });
  });

  it('롤오버 중 PoC 유효면 새 주기도 poc_free·청구 0', () => {
    // 8/10 00:00 KST 롤오버, PoC(9/30)까지 유효
    const a = planNextCycle(base, new Date('2026-08-09T15:00:00Z'));
    expect(a.type).toBe('rollover');
    if (a.type === 'rollover') {
      expect(a.newStatus).toBe('poc_free');
      expect(a.periodStart).toBe('2026-08-10');
      expect(a.periodEnd).toBe('2026-09-10');
      expect(a.charge).toBe(0);
      expect(a.channelLimit).toBe(20);
    }
  });

  it('S4 — 예약 다운그레이드가 롤오버 시 적용되고 채널 한도 반영', () => {
    const m = { ...base, status: 'active', pocFreeUntil: null, scheduledChange: { plan_code: 'small' } };
    const a = planNextCycle(m, new Date('2026-08-09T15:00:00Z'));
    expect(a.type).toBe('rollover');
    if (a.type === 'rollover') {
      expect(a.newPlan).toBe('small');
      expect(a.channelLimit).toBe(10);
      expect(a.billingStatus).toBe('success');
    }
  });

  it('해지(예약 free) 롤오버 → Free, skipped_free', () => {
    const m = { ...base, status: 'canceled', pocFreeUntil: null, scheduledChange: { plan_code: 'free', cancel: true } };
    const a = planNextCycle(m, new Date('2026-08-09T15:00:00Z'));
    if (a.type === 'rollover') {
      expect(a.newPlan).toBe('free');
      expect(a.billingStatus).toBe('skipped_free');
      expect(a.channelLimit).toBe(5);
    }
  });

  it('S6 — 유예 만료 시 Free 강등(새 주기)', () => {
    const m = {
      ...base,
      status: 'grace',
      pocFreeUntil: null,
      graceUntil: '2026-08-13T00:00:00.000Z',
    };
    // 유예 중(결제일 지났어도 롤오버 억제) → none
    expect(planNextCycle(m, new Date('2026-08-12T00:00:00Z')).type).toBe('none');
    const a = planNextCycle(m, new Date('2026-08-13T01:00:00Z'));
    expect(a.type).toBe('grace_expire');
    if (a.type === 'grace_expire') expect(a.newPlan).toBe('free');
  });
});
