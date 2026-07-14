import { describe, it, expect } from 'vitest';
import { isAutoPaused, pauseReasonLabel } from './pause';

describe('구독 일시정지 사유', () => {
  it('isAutoPaused: downgrade 만 자동', () => {
    expect(isAutoPaused('downgrade')).toBe(true);
    expect(isAutoPaused('manual')).toBe(false);
    expect(isAutoPaused(null)).toBe(false);
  });
  it('pauseReasonLabel: 사유별 문구', () => {
    // 자동정지(멤버십 한도) 문구는 "상위 플랜에서 직접 해제"를 안내하고, 자동 복원 문구는 없어야 한다.
    expect(pauseReasonLabel('downgrade')).toContain('멤버십 플랜 한도');
    expect(pauseReasonLabel('downgrade')).toContain('직접 정지 해제');
    expect(pauseReasonLabel('downgrade')).not.toContain('자동 복원');
    expect(pauseReasonLabel('manual')).toBe('직접 정지함');
    expect(pauseReasonLabel(null)).toBe('직접 정지함');
  });
});
