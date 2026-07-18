// 오타 교정 로그 조회의 순수 로직 — searchParams 파싱 · 페이지 계산 · 쿼리스트링(테스트 대상).
import type { CorrectionForm, CorrectionMethod } from './types';

export const CORRECTION_PAGE_SIZE = 50;

export type ParsedCorrectionQuery = {
  method?: CorrectionMethod;
  form?: CorrectionForm;
  search?: string;
  page: number;
  limit: number;
  offset: number;
};

const METHODS: CorrectionMethod[] = ['llm', 'admin'];
const FORMS: CorrectionForm[] = ['ko', 'en', 'hybrid'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** URL searchParams → 조회 파라미터. method·form 은 화이트리스트, q trim, page 1 이상. */
export function parseCorrectionQuery(
  sp: Record<string, string | string[] | undefined>,
  pageSize = CORRECTION_PAGE_SIZE,
): ParsedCorrectionQuery {
  const methodRaw = first(sp.method);
  const method = METHODS.includes(methodRaw as CorrectionMethod)
    ? (methodRaw as CorrectionMethod)
    : undefined;
  const formRaw = first(sp.form);
  const form = FORMS.includes(formRaw as CorrectionForm) ? (formRaw as CorrectionForm) : undefined;
  const searchRaw = first(sp.q)?.trim();
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  return {
    method,
    form,
    search: searchRaw ? searchRaw : undefined,
    page,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function totalPages(total: number, pageSize = CORRECTION_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 필터·검색·페이지를 유지하는 쿼리스트링(빈 값 생략, page>1 만 포함). */
export function correctionQueryString(opts: {
  method?: string;
  form?: string;
  search?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.method) params.set('method', opts.method);
  if (opts.form) params.set('form', opts.form);
  if (opts.search) params.set('q', opts.search);
  if (opts.page && opts.page > 1) params.set('page', String(opts.page));
  const s = params.toString();
  return s ? `?${s}` : '';
}
