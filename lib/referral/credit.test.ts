import { describe, it, expect } from 'vitest';
import {
  computeBalance,
  expiringSoon,
  deductFifo,
  isExpired,
  type CreditLot,
} from './credit';

const NOW = '2026-07-08T00:00:00.000Z';

function lot(id: string, remaining: number, expiresAt: string, grantedAt = NOW): CreditLot {
  return { id, remaining, expiresAt, grantedAt };
}

// 만료일(빠른→느린)
const soon = '2026-08-01T00:00:00.000Z'; // 24일 뒤(임박)
const mid = '2027-01-01T00:00:00.000Z';
const far = '2031-07-08T00:00:00.000Z'; // 5년
const past = '2026-07-01T00:00:00.000Z'; // 이미 만료

describe('computeBalance (AC-F1.1 로트 합)', () => {
  it('미만료·잔여 로트의 remaining 합', () => {
    const lots = [lot('a', 2000, far), lot('b', 500, mid)];
    expect(computeBalance(lots, NOW)).toBe(2500);
  });

  it('만료된 로트는 잔액에서 제외 (AC-F1.2)', () => {
    const lots = [lot('a', 2000, far), lot('expired', 2000, past)];
    expect(computeBalance(lots, NOW)).toBe(2000);
  });

  it('잔여 0 로트는 제외', () => {
    expect(computeBalance([lot('a', 0, far)], NOW)).toBe(0);
  });
});

describe('isExpired', () => {
  it('경계(만료일==now)는 만료로 본다', () => {
    expect(isExpired({ expiresAt: NOW }, NOW)).toBe(true);
    expect(isExpired({ expiresAt: far }, NOW)).toBe(false);
  });
});

describe('expiringSoon (AC-G1.1 곧 만료)', () => {
  it('30일 이내 만료 로트만 합산', () => {
    const lots = [lot('soon', 2000, soon), lot('far', 2000, far)];
    expect(expiringSoon(lots, NOW, 30)).toBe(2000);
  });
});

describe('deductFifo (AC-F2.1 FIFO + F2.2 결제 50%)', () => {
  it('만료 임박 순으로 차감한다', () => {
    const lots = [lot('far', 2000, far), lot('soon', 1000, soon), lot('mid', 2000, mid)];
    // 결제 10,000 → 최대 5,000 사용. soon(1000) → mid(2000) → far(2000) 순.
    const r = deductFifo(lots, 10000, NOW);
    expect(r.maxUsable).toBe(5000);
    expect(r.used).toBe(5000);
    expect(r.deductions).toEqual([
      { lotId: 'soon', amount: 1000 },
      { lotId: 'mid', amount: 2000 },
      { lotId: 'far', amount: 2000 },
    ]);
  });

  it('결제액의 50%를 넘겨 차감하지 않는다', () => {
    const lots = [lot('a', 100000, far)];
    const r = deductFifo(lots, 3000, NOW); // 최대 1,500
    expect(r.used).toBe(1500);
    expect(r.deductions).toEqual([{ lotId: 'a', amount: 1500 }]);
  });

  it('잔액이 상한보다 적으면 잔액까지만 사용', () => {
    const lots = [lot('a', 800, far)];
    const r = deductFifo(lots, 10000, NOW); // 상한 5,000이나 잔액 800
    expect(r.used).toBe(800);
  });

  it('만료 로트는 차감 대상에서 제외', () => {
    const lots = [lot('expired', 5000, past), lot('a', 5000, far)];
    const r = deductFifo(lots, 4000, NOW); // 최대 2,000
    expect(r.deductions).toEqual([{ lotId: 'a', amount: 2000 }]);
  });
});
