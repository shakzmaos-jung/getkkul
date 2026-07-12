import { describe, it, expect } from 'vitest';
import { maskEmail } from './mask';

describe('maskEmail (AC-OP-1a)', () => {
  it('로컬·도메인 각각 첫 글자만 남기고 마스킹', () => {
    expect(maskEmail('chess.jung@ppoint.kr')).toBe('c*********@p********');
    expect(maskEmail('a@b.co')).toBe('a@b***');
  });
  it('null/빈값은 "친구"', () => {
    expect(maskEmail(null)).toBe('친구');
    expect(maskEmail(undefined)).toBe('친구');
    expect(maskEmail('')).toBe('친구');
  });
  it('형식 이상(@ 없음/끝)은 방어적으로 원문', () => {
    expect(maskEmail('noat')).toBe('noat');
    expect(maskEmail('x@')).toBe('x@');
  });
});
