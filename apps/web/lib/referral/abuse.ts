/**
 * 어뷰징 판정 (REQ-I). 자기추천은 관계 생성 단계에서(AC-I1.4), 재가입 재보상은
 * 지급 단계에서(AC-I1.2) 차단한다. 판정은 순수 함수, 식별정보 보존/조회는 호출부.
 */

/** 자기추천: 추천인 == 피추천인 (AC-I1.4). */
export function isSelfReferral(referrerUserId: string, refereeUserId: string): boolean {
  return referrerUserId === refereeUserId;
}

export type AbuseBlockReason = 'self_referral' | 'rewarded_before';

export interface AbuseDecisionInput {
  /** 관계 생성 시점 판정에 사용(지급 판정에선 false). */
  selfReferral?: boolean;
  /** 이 정규화 이메일 해시로 과거 추천 보상이 발생한 적 있는가(AC-I1.2). */
  rewardedBefore?: boolean;
}

export interface AbuseDecision {
  allow: boolean;
  reason: 'ok' | AbuseBlockReason;
}

/** 지급/관계 허용 여부. 자기추천·재가입 재보상은 차단한다. */
export function abuseDecision(input: AbuseDecisionInput): AbuseDecision {
  if (input.selfReferral) return { allow: false, reason: 'self_referral' };
  if (input.rewardedBefore) return { allow: false, reason: 'rewarded_before' };
  return { allow: true, reason: 'ok' };
}
