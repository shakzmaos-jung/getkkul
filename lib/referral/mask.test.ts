import { describe, it, expect } from 'vitest';
import { maskEmail } from './mask';

describe('maskEmail', () => {
  it('로컬·도메인 첫 글자만 남기고 나머지 마스킹', () => {
    expect(maskEmail('chess.jung@ppoint.kr')).toBe('c*********@p********');
    expect(maskEmail('ab@cd.com')).toBe('a*@c*****');
  });
  it('단일 글자부는 그대로(마스킹할 나머지 없음)', () => {
    expect(maskEmail('a@b')).toBe('a@b');
  });
  it('빈 값/형식 이상은 방어', () => {
    expect(maskEmail(null)).toBe('친구');
    expect(maskEmail('')).toBe('친구');
    expect(maskEmail('noat')).toBe('noat');
    expect(maskEmail('@x')).toBe('@x');
  });
});
