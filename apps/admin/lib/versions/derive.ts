import type { VersionEntry, VersionType } from './types';

export type ParsedVersionQuery = {
  type?: VersionType;
  search?: string;
};

const TYPES: VersionType[] = ['major', 'minor', 'patch', 'baseline'];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** URL searchParams → 버전 필터. type 은 화이트리스트, q 는 trim. */
export function parseVersionQuery(
  sp: Record<string, string | string[] | undefined>,
): ParsedVersionQuery {
  const typeRaw = first(sp.type);
  const type = TYPES.includes(typeRaw as VersionType) ? (typeRaw as VersionType) : undefined;
  const searchRaw = first(sp.q)?.trim();
  return { type, search: searchRaw ? searchRaw : undefined };
}

/** type 일치 + 검색어를 version·요약·3단계 설명에 대소문자 무시 부분일치. */
export function filterVersions(entries: VersionEntry[], q: ParsedVersionQuery): VersionEntry[] {
  const needle = q.search?.toLowerCase();
  return entries.filter((e) => {
    if (q.type && e.type !== q.type) return false;
    if (needle) {
      const hay = `${e.version} ${e.summary} ${e.dev} ${e.nonDev} ${e.userImpact}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

/** 필터·검색을 유지하는 쿼리스트링(빈 값 생략). */
export function versionQueryString(opts: { type?: string; search?: string }): string {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.search) params.set('q', opts.search);
  const s = params.toString();
  return s ? `?${s}` : '';
}
