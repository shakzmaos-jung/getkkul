import { describe, it, expect } from 'vitest';
import { parseGlossaryQuery, totalPages, glossaryQueryString, GLOSSARY_PAGE_SIZE } from './derive';

describe('glossary derive', () => {
  it('parseGlossaryQuery: 기본값 · source/status 화이트리스트 · q trim · page→offset', () => {
    expect(parseGlossaryQuery({})).toEqual({
      source: undefined,
      status: undefined,
      search: undefined,
      page: 1,
      limit: GLOSSARY_PAGE_SIZE,
      offset: 0,
    });
    expect(parseGlossaryQuery({ source: 'admin', status: 'disabled', q: '  NPU  ', page: '2' }, 50)).toEqual({
      source: 'admin',
      status: 'disabled',
      search: 'NPU',
      page: 2,
      limit: 50,
      offset: 50,
    });
    expect(parseGlossaryQuery({ source: 'bogus' }).source).toBeUndefined();
    expect(parseGlossaryQuery({ status: 'bogus' }).status).toBeUndefined();
    expect(parseGlossaryQuery({ status: 'active' }).status).toBe('active');
    expect(parseGlossaryQuery({ page: '0' }).page).toBe(1);
  });

  it('totalPages · glossaryQueryString', () => {
    expect(totalPages(0, 50)).toBe(1);
    expect(totalPages(51, 50)).toBe(2);
    expect(glossaryQueryString({})).toBe('');
    expect(glossaryQueryString({ source: 'llm', status: 'active', search: 'x', page: 2 })).toBe(
      '?source=llm&status=active&q=x&page=2',
    );
  });
});
