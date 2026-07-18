import { describe, it, expect } from 'vitest';
import {
  parseCorrectionQuery,
  totalPages,
  correctionQueryString,
  CORRECTION_PAGE_SIZE,
} from './derive';

describe('parseCorrectionQuery', () => {
  it('빈 searchParams 는 기본값(page 1, offset 0)', () => {
    const q = parseCorrectionQuery({});
    expect(q).toEqual({
      method: undefined,
      form: undefined,
      search: undefined,
      page: 1,
      limit: CORRECTION_PAGE_SIZE,
      offset: 0,
    });
  });

  it('method·form 은 화이트리스트만 통과', () => {
    expect(parseCorrectionQuery({ method: 'admin', form: 'hybrid' })).toMatchObject({
      method: 'admin',
      form: 'hybrid',
    });
    expect(parseCorrectionQuery({ method: 'bogus', form: 'xx' })).toMatchObject({
      method: undefined,
      form: undefined,
    });
  });

  it('q 는 trim, 빈 문자열은 undefined', () => {
    expect(parseCorrectionQuery({ q: '  키미  ' }).search).toBe('키미');
    expect(parseCorrectionQuery({ q: '   ' }).search).toBeUndefined();
  });

  it('page 는 1 이상으로 클램프하고 offset 을 계산한다', () => {
    expect(parseCorrectionQuery({ page: '3' }, 50)).toMatchObject({ page: 3, offset: 100 });
    expect(parseCorrectionQuery({ page: '0' })).toMatchObject({ page: 1, offset: 0 });
    expect(parseCorrectionQuery({ page: 'abc' })).toMatchObject({ page: 1, offset: 0 });
  });

  it('배열 searchParams 는 첫 값 사용', () => {
    expect(parseCorrectionQuery({ method: ['llm', 'admin'] }).method).toBe('llm');
  });
});

describe('totalPages', () => {
  it('최소 1페이지, 올림 계산', () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(50, 50)).toBe(1);
    expect(totalPages(51, 50)).toBe(2);
    expect(totalPages(120, 50)).toBe(3);
  });
});

describe('correctionQueryString', () => {
  it('빈 값은 생략, page>1 만 포함', () => {
    expect(correctionQueryString({})).toBe('');
    expect(correctionQueryString({ page: 1 })).toBe('');
    expect(correctionQueryString({ method: 'admin', page: 2 })).toBe('?method=admin&page=2');
    expect(correctionQueryString({ form: 'en', search: '키미' })).toBe('?form=en&q=%ED%82%A4%EB%AF%B8');
  });
});
