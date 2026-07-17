import { describe, it, expect } from 'vitest';
import { parseSendQuery, totalPages, sendQueryString, SEND_PAGE_SIZE } from './derive';

describe('send-history derive', () => {
  it('parseSendQuery: 기본값', () => {
    expect(parseSendQuery({})).toEqual({
      slot: undefined,
      status: undefined,
      search: undefined,
      page: 1,
      limit: SEND_PAGE_SIZE,
      offset: 0,
    });
  });

  it('parseSendQuery: slot·status 화이트리스트 · q trim · page→offset', () => {
    expect(parseSendQuery({ slot: '0730', status: 'failed', q: '  a@b  ', page: '3' }, 50)).toEqual({
      slot: '0730',
      status: 'failed',
      search: 'a@b',
      page: 3,
      limit: 50,
      offset: 100,
    });
    expect(parseSendQuery({ slot: '9999' }).slot).toBeUndefined();
    expect(parseSendQuery({ status: 'bogus' }).status).toBeUndefined();
    expect(parseSendQuery({ page: '0' }).page).toBe(1);
    expect(parseSendQuery({ slot: ['1130', '0730'] }).slot).toBe('1130');
  });

  it('totalPages: 최소 1', () => {
    expect(totalPages(0, 50)).toBe(1);
    expect(totalPages(51, 50)).toBe(2);
  });

  it('sendQueryString: 빈 값 생략 · page>1 만', () => {
    expect(sendQueryString({})).toBe('');
    expect(sendQueryString({ page: 1 })).toBe('');
    expect(sendQueryString({ slot: '0730', status: 'sent', search: 'x', page: 2 })).toBe(
      '?slot=0730&status=sent&q=x&page=2',
    );
  });
});
