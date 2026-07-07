import { BUDGET_CAP, PER_USER_CAP, REWARD_AMOUNT } from './constants';

/**
 * 지급 전 예산·상한 가드 (REQ-E). 이 순수 함수는 규칙의 단일 명세이며,
 * DB 의 award_referral() plpgsql 이 같은 규칙을 트랜잭션(FOR UPDATE)으로 원자 집행한다(AC-E1.4).
 * 개별 수령자 판정이므로(AC-E1.3) 양쪽에 각각 호출한다.
 */

export type GrantDenyReason = 'per_user_cap' | 'budget_cap';

export interface GrantGuardInput {
  /** 프로그램 누적 발행액(현재까지). */
  totalIssued: number;
  /** 이 수령자가 지금까지 추천으로 획득한 누적액. */
  recipientAcquired: number;
  budgetCap?: number;
  perUserCap?: number;
  rewardAmount?: number;
}

export interface GrantGuardResult {
  grant: boolean;
  amount: number;
  reason: 'ok' | GrantDenyReason;
}

/**
 * 지급 여부를 판정한다.
 * - 1인 상한(AC-E1.1): 획득 누적 + 보상 > 상한 → 미지급.
 * - 예산 킬스위치(AC-E1.2): 발행 누적 + 보상 > 예산 → 미지급(초과 방지, cap 넘지 않음).
 * 상한 초과 시 amount=0. 한쪽이 막혀도 다른 쪽은 독립 판정된다(AC-E1.3).
 */
export function guardGrant(input: GrantGuardInput): GrantGuardResult {
  const budgetCap = input.budgetCap ?? BUDGET_CAP;
  const perUserCap = input.perUserCap ?? PER_USER_CAP;
  const rewardAmount = input.rewardAmount ?? REWARD_AMOUNT;

  if (input.recipientAcquired + rewardAmount > perUserCap) {
    return { grant: false, amount: 0, reason: 'per_user_cap' };
  }
  if (input.totalIssued + rewardAmount > budgetCap) {
    return { grant: false, amount: 0, reason: 'budget_cap' };
  }
  return { grant: true, amount: rewardAmount, reason: 'ok' };
}
