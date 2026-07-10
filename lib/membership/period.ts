/**
 * 멤버십 주기·비례정산 순수 계산 (server 의존 없음 → 단위 테스트 가능).
 */
import {
  kstYmd,
  parseYmd,
  formatYmd,
  nextPeriodStart,
  nextBillingAtUtc,
  periodDays,
  remainingDays,
} from './billing-cycle';
import { PLANS, type PlanCode } from './plans';
import { effectiveCharge, prorationAmount } from './charge';

/** PoC 무료 Medium 종료: 2026-09-30 23:59:59 KST. */
export const POC_FREE_UNTIL_ISO = '2026-09-30T14:59:59.000Z';
export const POC_DEFAULT_PLAN: PlanCode = 'medium';

/** 신규/시딩 멤버십의 계산값(now 기준 오늘 KST 시작 주기). */
export function freshMembershipValues(now: Date) {
  const start = kstYmd(now);
  const anchor = start.d;
  return {
    anchor,
    periodStart: formatYmd(start),
    periodEnd: formatYmd(nextPeriodStart(start, anchor)),
    nextBillingAt: nextBillingAtUtc(start, anchor).toISOString(),
  };
}

export interface Proration {
  raw: number; // 정가 비례정산액(기록·표시)
  charge: number; // 실제 청구액(무PG면 0)
  remainingDays: number;
  periodDays: number;
}

/** 업그레이드 비례정산 미리보기(AC-A1.2). */
export function computeProration(
  fromPlan: PlanCode,
  toPlan: PlanCode,
  periodStart: string,
  anchorDay: number,
  now: Date,
): Proration {
  const start = parseYmd(periodStart);
  const pDays = periodDays(start, anchorDay);
  const rDays = remainingDays(start, anchorDay, now);
  const raw = prorationAmount(PLANS[fromPlan].price, PLANS[toPlan].price, rDays, pDays);
  return { raw, charge: effectiveCharge(raw), remainingDays: rDays, periodDays: pDays };
}
