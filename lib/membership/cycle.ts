/**
 * 주기 전환 로직 (membership-spec §B/C/E/F). 순수 함수 — 잡이 이 결정을 받아 RPC 로 원자 적용한다.
 * 트리거 우선순위: PoC 종료 → 유예 만료 → 주기 롤오버(결제일 도래). 무PG(청구 0)라 grace 는 미발생.
 */
import { PLANS, isPlanCode, type PlanCode } from './plans';
import { parseYmd, formatYmd, nextPeriodStart, nextBillingAtUtc } from './billing-cycle';
import { effectiveCharge } from './charge';

export interface MembershipState {
  planCode: PlanCode;
  status: string;
  anchorDay: number;
  periodStart: string;
  periodEnd: string;
  nextBillingAt: string; // ISO
  scheduledChange: { plan_code?: string; cancel?: boolean } | null;
  graceUntil: string | null;
  pocFreeUntil: string | null;
}

export type CycleAction =
  | { type: 'none' }
  | { type: 'poc_end'; newPlan: PlanCode; newStatus: 'active'; clearPoc: true }
  | {
      type: 'rollover' | 'grace_expire';
      newPlan: PlanCode;
      newStatus: 'active' | 'poc_free';
      periodStart: string;
      periodEnd: string;
      nextBillingAt: string;
      charge: number;
      billingStatus: 'success' | 'skipped_free' | 'grace';
      channelLimit: number;
      clearPoc: boolean;
      billingPeriod: string; // 멱등키 주기
    };

function advance(start: string, anchorDay: number) {
  const s = parseYmd(start);
  const end = nextPeriodStart(s, anchorDay);
  return { periodStart: start, periodEnd: formatYmd(end), nextBillingAt: nextBillingAtUtc(s, anchorDay).toISOString() };
}

export function planNextCycle(m: MembershipState, now: Date): CycleAction {
  // 1) PoC 종료(결제일과 무관, 상태 전환). 무PG 0원이라 크레딧 결제 전환=성공 → active 유지.
  if (m.status === 'poc_free' && m.pocFreeUntil && now.getTime() >= new Date(m.pocFreeUntil).getTime()) {
    return { type: 'poc_end', newPlan: m.planCode, newStatus: 'active', clearPoc: true };
  }

  // 2) 유예 만료 → Free 강등 + 새 주기(무PG에선 미발생, v2 대비).
  if (m.status === 'grace' && m.graceUntil && now.getTime() >= new Date(m.graceUntil).getTime()) {
    const a = advance(m.periodEnd, m.anchorDay);
    return {
      type: 'grace_expire',
      newPlan: 'free',
      newStatus: 'active',
      ...a,
      charge: 0,
      billingStatus: 'skipped_free',
      channelLimit: PLANS.free.channelLimit,
      clearPoc: false,
      billingPeriod: a.periodStart,
    };
  }

  // 3) 주기 롤오버(결제일 도래). 유예 중이면 유예 만료(2)에서만 처리(중복 롤오버 방지).
  if (m.status !== 'grace' && now.getTime() >= new Date(m.nextBillingAt).getTime()) {
    const stillPoc =
      m.status === 'poc_free' && !!m.pocFreeUntil && now.getTime() < new Date(m.pocFreeUntil).getTime();
    const sched = m.scheduledChange;
    const newPlan: PlanCode =
      sched?.plan_code && isPlanCode(sched.plan_code) ? (sched.plan_code as PlanCode) : m.planCode;
    const a = advance(m.periodEnd, m.anchorDay);
    const charge = effectiveCharge(stillPoc || newPlan === 'free' ? 0 : PLANS[newPlan].price);
    return {
      type: 'rollover',
      newPlan,
      newStatus: stillPoc ? 'poc_free' : 'active',
      ...a,
      charge,
      billingStatus: newPlan === 'free' ? 'skipped_free' : 'success',
      channelLimit: PLANS[newPlan].channelLimit,
      clearPoc: !stillPoc && m.status === 'poc_free',
      billingPeriod: a.periodStart,
    };
  }

  return { type: 'none' };
}
