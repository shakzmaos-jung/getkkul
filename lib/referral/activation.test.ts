import { describe, it, expect } from 'vitest';
import { isActivated, activationProgress } from './activation';

describe('isActivated (AC-C1.1 채널3 AND 요약10)', () => {
  it('둘 다 충족하면 활성화', () => {
    expect(isActivated(3, 10)).toBe(true);
    expect(isActivated(5, 25)).toBe(true);
  });

  it('한 쪽만 충족이면 미활성', () => {
    expect(isActivated(3, 9)).toBe(false);
    expect(isActivated(2, 10)).toBe(false);
  });

  it('경계값 바로 아래는 미활성', () => {
    expect(isActivated(2, 100)).toBe(false);
    expect(isActivated(100, 9)).toBe(false);
  });
});

describe('activationProgress (AC-G2.1 진행률)', () => {
  it('진행률과 활성화 여부를 함께 준다', () => {
    expect(activationProgress(2, 7)).toEqual({
      channels: { have: 2, need: 3 },
      summaries: { have: 7, need: 10 },
      activated: false,
    });
  });
});
