// 멤버십 이력 조회의 순수 로직 — searchParams 파싱 · 페이지 계산 · 쿼리스트링(테스트 대상).
export const MH_PAGE_SIZE = 50;

export type ParsedMembershipQuery = {
  status?: string;
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

const STATUSES = ['success', 'failed', 'grace', 'skipped_free', 'proration'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseMembershipQuery(
  sp: Record<string, string | string[] | undefined>,
  pageSize = MH_PAGE_SIZE,
): ParsedMembershipQuery {
  const statusRaw = first(sp.status);
  const status = STATUSES.includes(statusRaw as string) ? statusRaw : undefined;
  const searchRaw = first(sp.q)?.trim();
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  return {
    status,
    search: searchRaw ? searchRaw : undefined,
    page,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function totalPages(total: number, pageSize = MH_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function membershipQueryString(opts: { status?: string; search?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.search) params.set('q', opts.search);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}
