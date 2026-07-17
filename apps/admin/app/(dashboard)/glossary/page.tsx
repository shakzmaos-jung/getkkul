import Link from 'next/link';
import { fetchGlossary } from '@/lib/glossary/fetch';
import { GlossaryTable } from '@/components/glossary/widgets';
import { FilterBar } from '@/components/glossary/FilterBar';
import { parseGlossaryQuery, totalPages, glossaryQueryString } from '@/lib/glossary/derive';
import type { Glossary } from '@/lib/glossary/types';

export const dynamic = 'force-dynamic';

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = parseGlossaryQuery(await searchParams);

  let data: Glossary;
  try {
    data = await fetchGlossary(q);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">용어사전을 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const pages = totalPages(data.total, q.limit);
  const href = (page: number) =>
    `/glossary${glossaryQueryString({ source: q.source, search: q.search, page })}`;
  const linkCls =
    'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-ink-subtle hover:text-ink';

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">용어 정의 (총 {data.total}개)</h2>
      <FilterBar source={q.source ?? ''} search={q.search ?? ''} />
      <GlossaryTable rows={data.rows} />
      <div className="flex items-center justify-between text-xs text-ink-subtle">
        <span>
          {q.page} / {pages} 페이지
        </span>
        <div className="flex gap-2">
          {q.page > 1 && (
            <Link href={href(q.page - 1)} className={linkCls}>
              ← 이전
            </Link>
          )}
          {q.page < pages && (
            <Link href={href(q.page + 1)} className={linkCls}>
              다음 →
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-ink-tertiary">
        정의는 요약 파이프라인이 용어당 1회 생성(LLM) · 관리자가 수정하면 출처가 관리자로 바뀌고 파이프라인이 다시 덮어쓰지 않습니다. 이메일 마스킹.
      </p>
    </div>
  );
}
