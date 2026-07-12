import { describe, it, expect } from 'vitest';
import {
  effectiveCharge,
  prorationAmount,
  idempotencyKey,
  paymentSucceeds,
} from './charge';
import { PLANS } from './plans';

describe('effectiveCharge (무PG 100% 할인)', () => {
  it('무PG면 0, 정가모드면 정가', () => {
    expect(effectiveCharge(2000, true)).toBe(0);
    expect(effectiveCharge(2000, false)).toBe(2000);
    expect(effectiveCharge(0, false)).toBe(0);
  });
});

describe('prorationAmount (S3 업그레이드 비례정산)', () => {
  it('남은 일수 비율 × 차액, 올림 없이 round', () => {
    // small(1000)→large(3000), 남은 16/31일 → round(2000*16/31)=round(1032.26)=1032
    expect(prorationAmount(PLANS.small.price, PLANS.large.price, 16, 31)).toBe(1032);
    // medium(2000)→large(3000), 남은 31/31 → 1000
    expect(prorationAmount(2000, 3000, 31, 31)).toBe(1000);
    // 남은 0일 → 0
    expect(prorationAmount(1000, 3000, 0, 31)).toBe(0);
  });
  it('업그레이드가 아니면(같거나 하위) 0', () => {
    expect(prorationAmount(3000, 1000, 16, 31)).toBe(0);
    expect(prorationAmount(2000, 2000, 16, 31)).toBe(0);
  });
  it('periodDays 0 방어', () => {
    expect(prorationAmount(1000, 3000, 5, 0)).toBe(0);
  });
});

describe('idempotencyKey (S7 멱등)', () => {
  it('(user, 주기시작)로 결정적', () => {
    expect(idempotencyKey('u1', '2026-07-10')).toBe('u1:2026-07-10');
    expect(idempotencyKey('u1', '2026-07-10')).toBe(idempotencyKey('u1', '2026-07-10'));
    expect(idempotencyKey('u1', '2026-08-10')).not.toBe(idempotencyKey('u1', '2026-07-10'));
  });
});

describe('paymentSucceeds', () => {
  it('청구 0(무PG)이면 크레딧 0이라도 성공', () => {
    expect(paymentSucceeds(0, 0)).toBe(true);
  });
  it('정가모드: 사용가능 크레딧이 청구액 이상이어야 성공', () => {
    expect(paymentSucceeds(1000, 1000)).toBe(true);
    expect(paymentSucceeds(1000, 999)).toBe(false);
  });
});
