/**
 * 결제일·주기 계산 (membership-spec §B, anchor day). 전부 KST 기준.
 * 순수 함수 — TDD 원천(S1·S2 무결점). Date 는 UTC 인스턴트, 달력 날짜는 KST Ymd 로 다룬다.
 *
 * 핵심: anchor day(가입일의 '일')를 저장하고, 매달 그 달에 유효한 최대 근접일로 clamp 한다.
 * 다음 주기는 항상 (다음달, anchorDay clamp)로 계산하므로, 한 번 내려가도(2월 28) 원래 anchor(31)로 복귀한다.
 */

export interface Ymd {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 해당 연·월(1-12)의 일수. 윤년 2월 반영. */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m 은 다음달-1일 = 이번달 말일
}

/** anchorDay 를 그 달의 말일로 clamp. 예 anchor 31, 2월 → 28/29. */
export function clampDay(anchorDay: number, y: number, m: number): number {
  return Math.min(anchorDay, daysInMonth(y, m));
}

/** (y, m) 의 다음 달(12월→익년 1월). */
export function nextMonthYm(y: number, m: number): { y: number; m: number } {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
}

/** 'YYYY-MM-DD' → Ymd. */
export function parseYmd(s: string): Ymd {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** Ymd → 'YYYY-MM-DD'. */
export function formatYmd(d: Ymd): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.y}-${p(d.m)}-${p(d.d)}`;
}

/** UTC 인스턴트의 KST 달력 날짜(Ymd). */
export function kstYmd(instant: Date): Ymd {
  const k = new Date(instant.getTime() + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}

/** KST 달력 날짜의 00:00:00 KST 에 해당하는 UTC 인스턴트. */
export function kstMidnightUtc(d: Ymd): Date {
  return new Date(Date.UTC(d.y, d.m - 1, d.d) - KST_OFFSET_MS);
}

/** 가입 시작 인스턴트에서 anchor day 추출(KST 일). */
export function anchorDayFromStart(startInstant: Date): number {
  return kstYmd(startInstant).d;
}

/**
 * 현재 주기 시작(KST Ymd)과 anchorDay 로 다음 주기 시작(KST Ymd)을 계산.
 * 다음달의 anchorDay clamp — anchor 복귀 규칙(AC-B1.2).
 */
export function nextPeriodStart(currentStart: Ymd, anchorDay: number): Ymd {
  const { y, m } = nextMonthYm(currentStart.y, currentStart.m);
  return { y, m, d: clampDay(anchorDay, y, m) };
}

/** 다음 결제(=다음 주기 시작 00:00 KST)의 UTC 인스턴트. */
export function nextBillingAtUtc(currentStart: Ymd, anchorDay: number): Date {
  return kstMidnightUtc(nextPeriodStart(currentStart, anchorDay));
}

/** 주기 종료 경계(다음 주기 시작 00:00 KST)를 지났는가 — now(UTC) 기준. */
export function isPeriodEnded(currentStart: Ymd, anchorDay: number, now: Date): boolean {
  return now.getTime() >= nextBillingAtUtc(currentStart, anchorDay).getTime();
}

/** 현재 주기의 총 일수(시작~다음 시작, KST 달력 일수). 비례정산 분모. */
export function periodDays(currentStart: Ymd, anchorDay: number): number {
  const next = nextPeriodStart(currentStart, anchorDay);
  const ms = kstMidnightUtc(next).getTime() - kstMidnightUtc(currentStart).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** now 시점에서 현재 주기의 '남은 일수'(다음 시작 00:00 KST 까지, 올림). 최소 0. */
export function remainingDays(currentStart: Ymd, anchorDay: number, now: Date): number {
  const endMs = nextBillingAtUtc(currentStart, anchorDay).getTime();
  const ms = endMs - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
