import { describe, it, expect } from 'vitest';
import { dailyUsd, totalUsd, costRatio, formatUsd } from './derive';
import type { CostBreakdown } from './types';

const cb: CostBreakdown = {
  model: 'gpt-5-nano',
  from: '2026-06-13',
  to: '2026-07-12',
  daily: [
    { day: '2026-07-11', promptTokens: 1_000_000, completionTokens: 100_000, calls: 10 },
    { day: '2026-07-12', promptTokens: 628_752, completionTokens: 114_610, calls: 5 },
  ],
  totals: { promptTokens: 1_628_752, completionTokens: 214_610, calls: 15 },
  email: { sent: 686, failed: 0 },
  quota: { day: '2026-07-12', unitsUsed: 0, cap: 2000 },
};

describe('비용 파생 (AC-CO-1a/b)', () => {
  it('일별 USD = 가격표 × 토큰', () => {
    const d = dailyUsd(cb);
    expect(d).toHaveLength(2);
    // 1M input($0.20) + 100k output($1.25/1M=0.125) = 0.325
    expect(d[0].usd).toBeCloseTo(0.2 + 0.125, 6);
  });
  it('총 USD = 총 토큰 × 가격표', () => {
    expect(totalUsd(cb)).toBeCloseTo((1_628_752 * 0.2 + 214_610 * 1.25) / 1_000_000, 6);
  });
  it('입력:출력 비율 배지 (AC-CO-1b) — getkkul은 전사 지배라 우수', () => {
    const { ratio, badge } = costRatio(cb);
    expect(ratio).toBeCloseTo(1_628_752 / 214_610); // ≈ 7.6
    expect(badge).toBe('excellent');
  });
  it('USD 표기(소액은 4자리)', () => {
    expect(formatUsd(0.0032)).toBe('$0.0032');
    expect(formatUsd(1.23)).toBe('$1.23');
  });
});
