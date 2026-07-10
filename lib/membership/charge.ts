/**
 * 결제 금액·비례정산·멱등키·성공판정 (membership-spec §C). 순수 함수 — TDD(S3·S7 기초).
 *
 * 결정(무PG 단계): 모든 플랜을 100% 할인해 이번 주기 '청구액'을 0원으로 만든다.
 * 크레딧 FIFO·50% 상한 엔진(use_credits)은 그대로 구현·테스트하되, 청구액이 0이라 실제 차감은 0.
 * PG 를 붙이는 v2 에서 NO_PG_FREE=false 로 바꾸면 정가 청구 + 크레딧 50% + PG 나머지로 전환된다.
 */

/** 무PG 기간: 모든 플랜 100% 할인(청구 0). PG 연동(v2)에서 false. */
export const NO_PG_FREE = true;

/** 이번 주기 실제 청구액(원). 무PG면 0, 아니면 정가. */
export function effectiveCharge(listPrice: number, noPgFree: boolean = NO_PG_FREE): number {
  return noPgFree ? 0 : Math.max(0, listPrice);
}

/**
 * 업그레이드 비례정산 원금(원). 남은 일수 비율로 (신규-기존) 차액. 업그레이드가 아니면 0.
 * round 는 원 단위. (무PG면 이 원금은 effectiveCharge 로 0 처리된다.)
 */
export function prorationAmount(
  fromPrice: number,
  toPrice: number,
  remainingDays: number,
  periodDays: number,
): number {
  if (periodDays <= 0) return 0;
  const diff = toPrice - fromPrice;
  if (diff <= 0) return 0;
  return Math.round((diff * Math.max(0, remainingDays)) / periodDays);
}

/** 주기 멱등키: (user_id, billing_period[YYYY-MM-DD 주기시작]). 주기당 1회(AC-C1.3). */
export function idempotencyKey(userId: string, periodStart: string): string {
  return `${userId}:${periodStart}`;
}

/**
 * 결제 성공 판정: 청구액을 사용 가능한 크레딧으로 충당할 수 있는가.
 * creditUsable = min(잔액, 청구액×50%) (use_credits 결과). 무PG(청구 0)면 항상 성공.
 */
export function paymentSucceeds(chargeAmount: number, creditUsable: number): boolean {
  return creditUsable >= chargeAmount;
}
