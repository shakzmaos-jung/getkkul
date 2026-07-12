import { describe, it, expect } from 'vitest';
import { PLANS, planRank, isUpgrade, isDowngrade, isPlanCode } from './plans';

describe('plans', () => {
  it('한도·요금 (spec §1)', () => {
    expect(PLANS.free).toMatchObject({ price: 0, channelLimit: 5, digestLimit: 30, aiQueryLimit: 10 });
    expect(PLANS.medium).toMatchObject({ price: 2000, channelLimit: 20, digestLimit: 500, aiQueryLimit: 50 });
    expect(PLANS.large.price).toBe(3000);
  });
  it('등급 순서·업/다운 판정', () => {
    expect(planRank('free')).toBeLessThan(planRank('large'));
    expect(isUpgrade('small', 'large')).toBe(true);
    expect(isUpgrade('large', 'small')).toBe(false);
    expect(isDowngrade('medium', 'free')).toBe(true);
    expect(isUpgrade('medium', 'medium')).toBe(false);
  });
  it('isPlanCode 가드', () => {
    expect(isPlanCode('medium')).toBe(true);
    expect(isPlanCode('xl')).toBe(false);
    expect(isPlanCode(null)).toBe(false);
  });
});
