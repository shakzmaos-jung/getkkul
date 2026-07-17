import { describe, it, expect } from 'vitest';
import { buildBillingCards, type BillingRow } from './history';

const row = (p: Partial<BillingRow>): BillingRow => ({
  period: '2026-07-10',
  planCode: 'medium',
  amount: 0,
  creditUsed: 0,
  status: 'skipped_free',
  at: '2026-07-10T00:00:00Z',
  memo: null,
  ...p,
});

describe('buildBillingCards', () => {
  it('빈 입력 → 빈 배열', () => {
    expect(buildBillingCards([])).toEqual([]);
  });

  it('PoC 무료 기간 → 청구/결제 0, 수단 PoC 무료, 업그레이드 없음', () => {
    const [c] = buildBillingCards([row({ status: 'skipped_free' })], {
      currentPeriodStart: '2026-07-10',
      currentPeriodEnd: '2026-08-09',
    });
    expect(c.billed).toBe(0);
    expect(c.paidCredit).toBe(0);
    expect(c.methods).toEqual([{ label: 'PoC 무료', amount: 0 }]);
    expect(c.upgrades).toEqual([]);
    expect(c.periodEnd).toBe('2026-08-09');
    expect(c.status).toBe('skipped_free');
  });

  it('크레딧 정기결제 → 청구=결제=수단(크레딧)', () => {
    const [c] = buildBillingCards([
      row({ period: '2026-05-10', planCode: 'small', amount: 1000, creditUsed: 1000, status: 'success' }),
    ]);
    expect(c.billed).toBe(1000);
    expect(c.paidCredit).toBe(1000);
    expect(c.methods).toEqual([{ label: '크레딧', amount: 1000 }]);
    expect(c.planCode).toBe('small');
  });

  it('월 중 업그레이드 → 한 카드에 이전→새 플랜, 청구/결제 합산', () => {
    const [c] = buildBillingCards([
      row({ period: '2026-06-10', planCode: 'small', amount: 1000, creditUsed: 1000, status: 'success', at: '2026-06-10T00:00:00Z' }),
      row({ period: '2026-06-10', planCode: 'medium', amount: 1000, creditUsed: 1000, status: 'proration', at: '2026-06-20T00:00:00Z' }),
    ]);
    expect(c.planCode).toBe('medium'); // 기간 최종 플랜
    expect(c.billed).toBe(2000);
    expect(c.paidCredit).toBe(2000);
    expect(c.status).toBe('success'); // 기준(비-proration) 행
    expect(c.upgrades).toEqual([{ fromPlan: 'small', toPlan: 'medium', amount: 1000, at: '2026-06-20T00:00:00Z' }]);
  });

  it('여러 기간 → 최신순 + periodEnd 체이닝(이전 카드 종료 = 다음 기간 시작−1일)', () => {
    const cards = buildBillingCards(
      [
        row({ period: '2026-05-10', planCode: 'small', amount: 1000, creditUsed: 1000, status: 'success' }),
        row({ period: '2026-06-10', planCode: 'medium', amount: 0, creditUsed: 0, status: 'skipped_free' }),
      ],
      { currentPeriodStart: '2026-06-10', currentPeriodEnd: '2026-07-09' },
    );
    expect(cards.map((c) => c.periodStart)).toEqual(['2026-06-10', '2026-05-10']); // desc
    expect(cards[0].periodEnd).toBe('2026-07-09'); // 최신 = 현재 주기 → currentPeriodEnd
    expect(cards[1].periodEnd).toBe('2026-06-09'); // 이전 = 다음 기간 시작−1
  });

  it('최신 이력 기간이 현재 주기와 다르면(과거 이력만) 월 단위 근사 종료일', () => {
    const [c] = buildBillingCards([row({ period: '2026-06-10', status: 'skipped_free' })], {
      currentPeriodStart: '2026-07-10', // 현재 주기는 7/10 (이력엔 없음)
      currentPeriodEnd: '2026-08-09',
    });
    expect(c.periodEnd).toBe('2026-07-09'); // currentPeriodEnd 아님, 6/10 + 1달 −1일
  });

  it('memo=샘플 이면 sample=true', () => {
    const [c] = buildBillingCards([row({ memo: '샘플' })]);
    expect(c.sample).toBe(true);
  });
});
