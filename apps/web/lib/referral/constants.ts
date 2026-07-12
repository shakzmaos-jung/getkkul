/**
 * 친구추천 크레딧 프로그램 확정 상수 (referral-spec §0, §M).
 * 이 값들의 런타임 권위(예산 집계 등)는 DB referral_program 단일 행이며,
 * 아래는 그 기본값이자 순수 함수 계산의 기준값이다.
 */

/** 활성화 조건: 채널 구독 수 ≥ 3 (AC-C1.1). */
export const ACTIVATION_MIN_CHANNELS = 3;
/** 활성화 조건: 수신한 요약 항목 누적 ≥ 10 (AC-C1.1/C1.2). */
export const ACTIVATION_MIN_SUMMARIES = 10;

/** 지급 1건 보상액 (추천인/피추천인 각각, AC-D1.1). */
export const REWARD_AMOUNT = 2000;
/** 1인 획득 상한 (AC-E1.1). */
export const PER_USER_CAP = 50000;
/** 예산 킬스위치: 누적 발행 상한 (AC-E1.2). */
export const BUDGET_CAP = 5000000;
/** 결제 사용 상한 비율 (AC-F2.2). */
export const PAYMENT_USAGE_RATIO = 0.5;
/** 지급 건별 유효기간(년) (AC-D1.2). */
export const VALIDITY_YEARS = 5;
/** "곧 만료 예정" 표시 임계 일수 (AC-G1.1). */
export const EXPIRING_SOON_DAYS = 30;
