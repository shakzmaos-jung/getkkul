// 피드백 이력 조회의 순수 로직 — searchParams 파싱 · 페이지 계산 · 쿼리스트링 빌드(테스트 대상).
export const FEEDBACK_PAGE_SIZE = 50;

export type ParsedFeedbackQuery = {
  rating?: 'up' | 'down';
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** URL searchParams → 조회 파라미터. rating 은 화이트리스트, page 는 1 이상. */
export function parseFeedbackQuery(
  sp: Record<string, string | string[] | undefined>,
  pageSize = FEEDBACK_PAGE_SIZE,
): ParsedFeedbackQuery {
  const ratingRaw = first(sp.rating);
  const rating = ratingRaw === 'up' || ratingRaw === 'down' ? ratingRaw : undefined;
  const searchRaw = first(sp.q)?.trim();
  const search = searchRaw ? searchRaw : undefined;
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  return { rating, search, page, limit: pageSize, offset: (page - 1) * pageSize };
}

/** 총 건수 → 페이지 수(최소 1). */
export function totalPages(total: number, pageSize = FEEDBACK_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 필터·검색·페이지를 유지하는 쿼리스트링(빈 값 생략, page>1 만 포함). */
export function feedbackQueryString(opts: { rating?: string; search?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.rating) params.set('rating', opts.rating);
  if (opts.search) params.set('q', opts.search);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}
