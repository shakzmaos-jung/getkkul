import { EXPIRING_SOON_DAYS, PAYMENT_USAGE_RATIO } from './constants';

/**
 * 크레딧 원장 계산 (REQ-F). 잔액은 단일 숫자가 아니라 미만료·잔여 있는 지급 건(lot)의
 * remaining 합으로 산출한다(AC-F1.1). 사용은 만료 임박 순(FIFO) 차감(AC-F2.1),
 * 결제 1건당 최대 결제액의 50%(AC-F2.2). 이 순수 함수가 사용 로직의 명세이며,
 * 실제 결제 연동은 v2 로 이연한다(AC-F2.3) — DB use_credits() 가 원자 버전을 제공한다.
 */

/** 크레딧 지급 건(로트). expiresAt/grantedAt 은 ISO-8601 문자열. */
export interface CreditLot {
  id: string;
  remaining: number;
  expiresAt: string;
  grantedAt: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 만료 여부: expiresAt <= now 이면 만료(경계 포함). */
export function isExpired(lot: Pick<CreditLot, 'expiresAt'>, nowIso: string): boolean {
  return new Date(lot.expiresAt).getTime() <= new Date(nowIso).getTime();
}

/** 미만료 + 잔여>0 로트만 만료 임박 순으로 정렬(FIFO: 같으면 지급 오래된 순). */
export function usableLots(lots: CreditLot[], nowIso: string): CreditLot[] {
  return lots
    .filter((l) => l.remaining > 0 && !isExpired(l, nowIso))
    .sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime() ||
        new Date(a.grantedAt).getTime() - new Date(b.grantedAt).getTime(),
    );
}

/** 사용 가능 잔액 = 미만료·잔여 로트 remaining 합 (AC-F1.1). */
export function computeBalance(lots: CreditLot[], nowIso: string): number {
  return usableLots(lots, nowIso).reduce((sum, l) => sum + l.remaining, 0);
}

/** "곧 만료 예정" 금액: now..now+days 안에 만료되는 미만료 로트 remaining 합 (AC-G1.1). */
export function expiringSoon(
  lots: CreditLot[],
  nowIso: string,
  days = EXPIRING_SOON_DAYS,
): number {
  const now = new Date(nowIso).getTime();
  const until = now + days * MS_PER_DAY;
  return usableLots(lots, nowIso)
    .filter((l) => new Date(l.expiresAt).getTime() <= until)
    .reduce((sum, l) => sum + l.remaining, 0);
}

export interface Deduction {
  lotId: string;
  amount: number;
}

export interface FifoResult {
  /** 결제액 기준 크레딧 사용 상한(=floor(payment*ratio)). */
  maxUsable: number;
  /** 실제 차감 총액. */
  used: number;
  /** 로트별 차감 내역(FIFO 순). */
  deductions: Deduction[];
}

/**
 * FIFO 차감 계산(AC-F2.1/F2.2). 만료 임박 순으로, 결제액의 ratio(기본 50%)까지 차감한다.
 * 상태를 바꾸지 않는 순수 계산이며, 반환된 deductions 를 원자 트랜잭션에서 적용한다.
 */
export function deductFifo(
  lots: CreditLot[],
  paymentAmount: number,
  nowIso: string,
  ratio = PAYMENT_USAGE_RATIO,
): FifoResult {
  const maxUsable = Math.floor(Math.max(0, paymentAmount) * ratio);
  const deductions: Deduction[] = [];
  let remainingNeed = maxUsable;

  for (const lot of usableLots(lots, nowIso)) {
    if (remainingNeed <= 0) break;
    const take = Math.min(lot.remaining, remainingNeed);
    if (take > 0) {
      deductions.push({ lotId: lot.id, amount: take });
      remainingNeed -= take;
    }
  }

  return { maxUsable, used: maxUsable - remainingNeed, deductions };
}
