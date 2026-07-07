import { describe, it, expect } from 'vitest';
import { normalizeEmail, hashEmail, normalizedEmailHash } from './email-hash';

describe('normalizeEmail (AC-I1.1 정규화)', () => {
  it('대소문자·공백을 흡수한다', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com');
  });

  it('Gmail 점을 제거하고 도메인을 통일한다', () => {
    expect(normalizeEmail('f.o.o@gmail.com')).toBe('foo@gmail.com');
    expect(normalizeEmail('foo@googlemail.com')).toBe('foo@gmail.com');
  });

  it('Gmail plus 태그를 제거한다', () => {
    expect(normalizeEmail('foo+promo@gmail.com')).toBe('foo@gmail.com');
    expect(normalizeEmail('f.o.o+x@googlemail.com')).toBe('foo@gmail.com');
  });

  it('비-Gmail 도메인은 점을 유지하되 plus 태그만 제거한다', () => {
    expect(normalizeEmail('a.b+tag@naver.com')).toBe('a.b@naver.com');
  });

  it('같은 사람의 변형들은 같은 정규형이 된다', () => {
    const forms = ['Foo.Bar@gmail.com', 'foobar+ads@googlemail.com', 'f.o.o.b.a.r@gmail.com'];
    const set = new Set(forms.map((e) => normalizeEmail(e)));
    expect(set.size).toBe(1);
  });
});

describe('hashEmail (AC-I1.1 단방향 해시)', () => {
  it('정규형이 같으면 해시도 같다(재가입 매칭)', () => {
    expect(normalizedEmailHash('Foo.Bar@gmail.com')).toBe(
      normalizedEmailHash('foobar+x@googlemail.com'),
    );
  });

  it('원문/정규형과 달라 복호가 불가한 64-hex 다이제스트다', () => {
    const h = hashEmail('foo@example.com');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('foo@example.com');
  });

  it('pepper 가 다르면 해시가 달라진다', () => {
    expect(hashEmail('foo@example.com', 'p1')).not.toBe(hashEmail('foo@example.com', 'p2'));
  });
});
