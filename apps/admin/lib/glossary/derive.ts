// 용어사전 조회의 순수 로직 — searchParams 파싱 · 페이지 계산 · 쿼리스트링(테스트 대상).
export const GLOSSARY_PAGE_SIZE = 50;

export type ParsedGlossaryQuery = {
  source?: 'llm' | 'admin';
  status?: 'active' | 'disabled';
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

const SOURCES = ['llm', 'admin'];
const STATUSES = ['active', 'disabled'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseGlossaryQuery(
  sp: Record<string, string | string[] | undefined>,
  pageSize = GLOSSARY_PAGE_SIZE,
): ParsedGlossaryQuery {
  const sourceRaw = first(sp.source);
  const source = SOURCES.includes(sourceRaw as string) ? (sourceRaw as 'llm' | 'admin') : undefined;
  const statusRaw = first(sp.status);
  const status = STATUSES.includes(statusRaw as string) ? (statusRaw as 'active' | 'disabled') : undefined;
  const searchRaw = first(sp.q)?.trim();
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  return {
    source,
    status,
    search: searchRaw ? searchRaw : undefined,
    page,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function totalPages(total: number, pageSize = GLOSSARY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function glossaryQueryString(opts: {
  source?: string;
  status?: string;
  search?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.source) params.set('source', opts.source);
  if (opts.status) params.set('status', opts.status);
  if (opts.search) params.set('q', opts.search);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}
