import { describe, it, expect } from 'vitest';
import { parseMembershipQuery, totalPages, membershipQueryString, MH_PAGE_SIZE } from './derive';

describe('membership history derive', () => {
  it('parseMembershipQuery: status 화이트리스트 · q trim · page→offset', () => {
    expect(parseMembershipQuery({})).toEqual({
      status: undefined,
      search: undefined,
      page: 1,
      limit: MH_PAGE_SIZE,
      offset: 0,
    });
    expect(parseMembershipQuery({ status: 'proration', q: '  a@b  ', page: '2' }, 50)).toEqual({
      status: 'proration',
      search: 'a@b',
      page: 2,
      limit: 50,
      offset: 50,
    });
    expect(parseMembershipQuery({ status: 'bogus' }).status).toBeUndefined();
    expect(parseMembershipQuery({ page: '0' }).page).toBe(1);
  });

  it('totalPages · membershipQueryString', () => {
    expect(totalPages(0, 50)).toBe(1);
    expect(totalPages(51, 50)).toBe(2);
    expect(membershipQueryString({})).toBe('');
    expect(membershipQueryString({ status: 'success', search: 'x', page: 2 })).toBe('?status=success&q=x&page=2');
  });
});
