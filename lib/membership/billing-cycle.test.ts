import { describe, it, expect } from 'vitest';
import {
  daysInMonth,
  clampDay,
  nextPeriodStart,
  formatYmd,
  parseYmd,
  kstYmd,
  kstMidnightUtc,
  anchorDayFromStart,
  nextBillingAtUtc,
  isPeriodEnded,
  periodDays,
  remainingDays,
} from './billing-cycle';

describe('daysInMonth (윤년 포함)', () => {
  it('2월: 평년 28, 윤년 29', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29); // 2028 윤년
    expect(daysInMonth(2100, 2)).toBe(28); // 100의 배수·400 아님 → 평년
    expect(daysInMonth(2000, 2)).toBe(29); // 400의 배수 → 윤년
  });
  it('30일/31일 달', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('clampDay', () => {
  it('anchor 31 → 달 말일로 clamp', () => {
    expect(clampDay(31, 2026, 2)).toBe(28);
    expect(clampDay(31, 2028, 2)).toBe(29);
    expect(clampDay(31, 2026, 4)).toBe(30);
    expect(clampDay(31, 2026, 3)).toBe(31);
    expect(clampDay(15, 2026, 2)).toBe(15); // 유효일은 그대로
  });
});

describe('nextPeriodStart — anchor 복귀 (S1)', () => {
  it('1/31 가입(anchor 31): 2월 28, 다시 3월 31 복귀', () => {
    const jan = parseYmd('2026-01-31');
    const feb = nextPeriodStart(jan, 31);
    expect(formatYmd(feb)).toBe('2026-02-28'); // 평년
    const mar = nextPeriodStart(feb, 31);
    expect(formatYmd(mar)).toBe('2026-03-31'); // anchor 31 복귀
    const apr = nextPeriodStart(mar, 31);
    expect(formatYmd(apr)).toBe('2026-04-30');
  });
  it('윤년 2월: 1/31 → 2/29 (2028)', () => {
    expect(formatYmd(nextPeriodStart(parseYmd('2028-01-31'), 31))).toBe('2028-02-29');
  });
  it('12월 → 익년 1월 롤오버', () => {
    expect(formatYmd(nextPeriodStart(parseYmd('2026-12-31'), 31))).toBe('2027-01-31');
  });
});

describe('S2 — 시작일 28/29/30/31 × 여러 달 조합', () => {
  const cases: [string, number, string][] = [
    ['2026-01-28', 28, '2026-02-28'],
    ['2026-01-29', 29, '2026-02-28'], // 평년 2월 → 28
    ['2028-01-29', 29, '2028-02-29'], // 윤년 2월 → 29
    ['2026-01-30', 30, '2026-02-28'],
    ['2026-03-31', 31, '2026-04-30'],
    ['2026-05-31', 31, '2026-06-30'],
    ['2026-02-28', 31, '2026-03-31'], // anchor 31 유지 → 3월 31 복귀
  ];
  it.each(cases)('%s (anchor %i) → %s', (start, anchor, expected) => {
    expect(formatYmd(nextPeriodStart(parseYmd(start), anchor))).toBe(expected);
  });
});

describe('KST 인스턴트 변환', () => {
  it('kstMidnightUtc: KST 00:00 = 전날 15:00 UTC', () => {
    expect(kstMidnightUtc(parseYmd('2026-07-10')).toISOString()).toBe('2026-07-09T15:00:00.000Z');
  });
  it('kstYmd: UTC 인스턴트의 KST 달력일 (경계)', () => {
    // 2026-07-09T15:00Z = 2026-07-10 00:00 KST
    expect(formatYmd(kstYmd(new Date('2026-07-09T15:00:00Z')))).toBe('2026-07-10');
    // 2026-07-09T14:59Z = 2026-07-09 23:59 KST
    expect(formatYmd(kstYmd(new Date('2026-07-09T14:59:00Z')))).toBe('2026-07-09');
  });
  it('anchorDayFromStart: KST 일 추출', () => {
    // 2026-01-30T20:00Z = 2026-01-31 05:00 KST → anchor 31
    expect(anchorDayFromStart(new Date('2026-01-30T20:00:00Z'))).toBe(31);
  });
});

describe('종료 경계 (AC-B1.3) — 종료일 다음날 00:00 KST', () => {
  it('nextBillingAtUtc & isPeriodEnded', () => {
    const start = parseYmd('2026-07-10'); // anchor 10
    const nextAt = nextBillingAtUtc(start, 10); // 2026-08-10 00:00 KST
    expect(nextAt.toISOString()).toBe('2026-08-09T15:00:00.000Z');
    // 종료일(8/9) 23:59:59 KST = 8/9T14:59:59Z → 아직 안 끝남
    expect(isPeriodEnded(start, 10, new Date('2026-08-09T14:59:59Z'))).toBe(false);
    // 8/10 00:00 KST = 8/9T15:00Z → 종료
    expect(isPeriodEnded(start, 10, new Date('2026-08-09T15:00:00Z'))).toBe(true);
  });
});

describe('periodDays / remainingDays (비례정산 기초)', () => {
  it('periodDays: 7/10~8/10 = 31일', () => {
    expect(periodDays(parseYmd('2026-07-10'), 10)).toBe(31);
  });
  it('periodDays: 2/28~3/31(anchor31, 평년) = 31일', () => {
    expect(periodDays(parseYmd('2026-02-28'), 31)).toBe(31);
  });
  it('remainingDays: 주기 중반', () => {
    const start = parseYmd('2026-07-10'); // 다음 8/10 00:00 KST
    // 7/25 00:00 KST = 7/24T15:00Z → 8/10까지 16일
    expect(remainingDays(start, 10, new Date('2026-07-24T15:00:00Z'))).toBe(16);
    // 종료 이후 → 0
    expect(remainingDays(start, 10, new Date('2026-08-10T00:00:00Z'))).toBe(0);
  });
});
