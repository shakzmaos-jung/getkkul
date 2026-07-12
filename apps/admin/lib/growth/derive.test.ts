import { describe, it, expect } from 'vitest';
import { formatPct, formatKrw, funnelRates } from './derive';

describe('그로스 표현 로직', () => {
  it('formatPct: 비율 → % (null은 —)', () => {
    expect(formatPct(0.7143)).toBe('71%');
    expect(formatPct(1)).toBe('100%');
    expect(formatPct(null)).toBe('—');
  });
  it('formatKrw: 원화 천단위', () => {
    expect(formatKrw(5_000_000)).toBe('₩5,000,000');
    expect(formatKrw(4000)).toBe('₩4,000');
  });
  it('funnelRates: 가입→구독, 구독→발송 전환율 (AC-GR-1 퍼널)', () => {
    const r = funnelRates({ signedUp: 7, subscribed: 5, delivered: 5 });
    expect(r.subscribeRate).toBeCloseTo(5 / 7);
    expect(r.deliverRate).toBe(1);
  });
  it('funnelRates: 0 분모는 null', () => {
    const r = funnelRates({ signedUp: 0, subscribed: 0, delivered: 0 });
    expect(r.subscribeRate).toBeNull();
    expect(r.deliverRate).toBeNull();
  });
});
