import { describe, it, expect } from 'vitest';
import { computeCreditTotals } from './queries';

describe('computeCreditTotals (총 획득/사용)', () => {
  it('grant 합=획득, usage 절대합=사용, 만료/소멸은 제외', () => {
    const r = computeCreditTotals([
      { delta: 2000, kind: 'grant' },
      { delta: 2000, kind: 'grant' },
      { delta: -1500, kind: 'usage' },
      { delta: -500, kind: 'expiry' }, // 만료는 사용/획득 아님
      { delta: -1000, kind: 'forfeit' }, // 소멸도 제외
    ]);
    expect(r.totalEarned).toBe(4000);
    expect(r.totalUsed).toBe(1500);
  });
  it('빈 내역은 0/0', () => {
    expect(computeCreditTotals([])).toEqual({ totalEarned: 0, totalUsed: 0 });
  });
});
