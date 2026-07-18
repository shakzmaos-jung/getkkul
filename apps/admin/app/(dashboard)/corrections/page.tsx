import Link from 'next/link';
import { fetchCorrections } from '@/lib/corrections/fetch';
import { CorrectionTable } from '@/components/corrections/widgets';
import { FilterBar } from '@/components/corrections/FilterBar';
import { parseCorrectionQuery, totalPages, correctionQueryString } from '@/lib/corrections/derive';
import type { CorrectionLog } from '@/lib/corrections/types';

export const dynamic = 'force-dynamic';

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = parseCorrectionQuery(await searchParams);

  let data: CorrectionLog;
  try {
    data = await fetchCorrections(q);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">교정 로그를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const pages = totalPages(data.total, q.limit);
  const href = (page: number) =>
    `/corrections${correctionQueryString({ method: q.method, form: q.form, search: q.search, page })}`;
  const linkCls =
    'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-ink-subtle hover:text-ink';

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">
        자막 용어 오인식 자동 교정 로그 (총 {data.total}건)
      </h2>
      <FilterBar method={q.method ?? ''} form={q.form ?? ''} search={q.search ?? ''} />
      <CorrectionTable rows={data.rows} />
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
        요약 생성 시 gpt-5-nano 가 맥락에 맞게 교정한 기록(KST). &apos;보기&apos;로 원문 콘텐츠를,
        &apos;수정&apos;으로 교정 표기·표기형·메모를 편집할 수 있습니다(수정 시 재적재에 덮이지 않음).
      </p>
    </div>
  );
}
