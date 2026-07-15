import { describe, it, expect } from 'vitest';
import {
  parseFeedbackQuery,
  totalPages,
  feedbackQueryString,
  FEEDBACK_PAGE_SIZE,
} from './derive';

describe('feedback derive', () => {
  it('parseFeedbackQuery: 기본값(빈 searchParams)', () => {
    expect(parseFeedbackQuery({})).toEqual({
      rating: undefined,
      search: undefined,
      page: 1,
      limit: FEEDBACK_PAGE_SIZE,
      offset: 0,
    });
  });

  it('parseFeedbackQuery: rating 화이트리스트 · 검색 trim · page→offset', () => {
    expect(parseFeedbackQuery({ rating: 'down', q: '  fmt  ', page: '3' }, 50)).toEqual({
      rating: 'down',
      search: 'fmt',
      page: 3,
      limit: 50,
      offset: 100,
    });
    expect(parseFeedbackQuery({ rating: 'bogus' }).rating).toBeUndefined();
    expect(parseFeedbackQuery({ page: '0' }).page).toBe(1);
    expect(parseFeedbackQuery({ page: 'x' }).page).toBe(1);
    // string[] 도 첫 값 사용
    expect(parseFeedbackQuery({ rating: ['up', 'down'] }).rating).toBe('up');
  });

  it('totalPages: 최소 1', () => {
    expect(totalPages(0, 50)).toBe(1);
    expect(totalPages(50, 50)).toBe(1);
    expect(totalPages(51, 50)).toBe(2);
  });

  it('feedbackQueryString: 빈 값 생략 · page>1 만 포함', () => {
    expect(feedbackQueryString({})).toBe('');
    expect(feedbackQueryString({ page: 1 })).toBe('');
    expect(feedbackQueryString({ rating: 'up' })).toBe('?rating=up');
    expect(feedbackQueryString({ rating: 'down', search: 'fmt', page: 2 })).toBe(
      '?rating=down&q=fmt&page=2',
    );
  });
});
