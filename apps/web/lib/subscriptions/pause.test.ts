import { describe, it, expect } from 'vitest';
import { isAutoPaused, pauseReasonLabel } from './pause';

describe('구독 일시정지 사유', () => {
  it('isAutoPaused: downgrade 만 자동', () => {
    expect(isAutoPaused('downgrade')).toBe(true);
    expect(isAutoPaused('manual')).toBe(false);
    expect(isAutoPaused(null)).toBe(false);
  });
  it('pauseReasonLabel: 사유별 문구', () => {
    expect(pauseReasonLabel('downgrade')).toContain('다운그레이드');
    expect(pauseReasonLabel('downgrade')).toContain('자동 복원');
    expect(pauseReasonLabel('manual')).toBe('직접 정지함');
    expect(pauseReasonLabel(null)).toBe('직접 정지함');
  });
});
