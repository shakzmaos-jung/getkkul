import { describe, it, expect } from 'vitest';
import {
  computeUsd,
  inputOutputRatio,
  ratioBadge,
} from './llm-prices';

describe('computeUsd (AC-CO-1a)', () => {
  it('gpt-5-nano: 입력 $0.20 + 출력 $1.25 per 1M', () => {
    expect(computeUsd('gpt-5-nano', 1_000_000, 1_000_000)).toBeCloseTo(1.45, 6);
  });
  it('이번달 실측 토큰 → USD', () => {
    const usd = computeUsd('gpt-5-nano', 1_628_752, 214_610);
    expect(usd).toBeCloseTo((1_628_752 * 0.2 + 214_610 * 1.25) / 1_000_000, 6);
  });
  it('캐시 토큰은 캐시 단가($0.02)로', () => {
    expect(computeUsd('gpt-5-nano', 1_000_000, 0, 1_000_000)).toBeCloseTo(0.02, 6);
  });
  it('미등록 모델은 0', () => {
    expect(computeUsd('unknown-model', 1_000_000, 1_000_000)).toBe(0);
  });
});

describe('입력:출력 비율 배지 (AC-CO-1b)', () => {
  it('비율 = prompt/completion (출력 0이면 null)', () => {
    expect(inputOutputRatio(76, 10)).toBeCloseTo(7.6);
    expect(inputOutputRatio(100, 0)).toBeNull();
  });
  it('임계: <10 우수 / 10–25 정상 / 25–50 조사 / >50 심각', () => {
    expect(ratioBadge(7.6)).toBe('excellent');
    expect(ratioBadge(10)).toBe('normal');
    expect(ratioBadge(24.9)).toBe('normal');
    expect(ratioBadge(30)).toBe('investigate');
    expect(ratioBadge(50)).toBe('investigate');
    expect(ratioBadge(51)).toBe('critical');
  });
});
