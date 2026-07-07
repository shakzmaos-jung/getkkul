import { describe, it, expect } from 'vitest';
import { classifyPushGone } from './web-push';

describe('classifyPushGone (무효 구독 감지 AC-C1.5)', () => {
  it('404/410 은 만료·무효(삭제 대상)', () => {
    expect(classifyPushGone(404)).toBe(true);
    expect(classifyPushGone(410)).toBe(true);
  });
  it('그 외/undefined 는 삭제하지 않음(일시 오류일 수 있음)', () => {
    expect(classifyPushGone(500)).toBe(false);
    expect(classifyPushGone(429)).toBe(false);
    expect(classifyPushGone(undefined)).toBe(false);
  });
});
