// 발송 이력 조회의 순수 로직 — searchParams 파싱 · 페이지 계산 · 쿼리스트링(테스트 대상).
export const SEND_PAGE_SIZE = 50;

export type SendStatus = 'sent' | 'failed' | 'empty';

export type ParsedSendQuery = {
  slot?: string;
  status?: SendStatus;
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

const SLOTS = ['0730', '1130', '1730', '2130'];
const STATUSES: SendStatus[] = ['sent', 'failed', 'empty'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** URL searchParams → 조회 파라미터. slot·status 는 화이트리스트, q trim, page 1 이상. */
export function parseSendQuery(
  sp: Record<string, string | string[] | undefined>,
  pageSize = SEND_PAGE_SIZE,
): ParsedSendQuery {
  const slotRaw = first(sp.slot);
  const slot = slotRaw && SLOTS.includes(slotRaw) ? slotRaw : undefined;
  const statusRaw = first(sp.status);
  const status = STATUSES.includes(statusRaw as SendStatus) ? (statusRaw as SendStatus) : undefined;
  const searchRaw = first(sp.q)?.trim();
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  return { slot, status, search: searchRaw ? searchRaw : undefined, page, limit: pageSize, offset: (page - 1) * pageSize };
}

export function totalPages(total: number, pageSize = SEND_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 필터·검색·페이지를 유지하는 쿼리스트링(빈 값 생략, page>1 만 포함). */
export function sendQueryString(opts: { slot?: string; status?: string; search?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.slot) params.set('slot', opts.slot);
  if (opts.status) params.set('status', opts.status);
  if (opts.search) params.set('q', opts.search);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}
