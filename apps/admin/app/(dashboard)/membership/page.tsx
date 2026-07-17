import Link from 'next/link';
import { fetchMembershipHistory } from '@/lib/membership/fetch';
import { MembershipHistoryTable } from '@/components/membership/widgets';
import { FilterBar } from '@/components/membership/FilterBar';
import { parseMembershipQuery, totalPages, membershipQueryString } from '@/lib/membership/derive';
import type { MembershipHistory } from '@/lib/membership/types';

export const dynamic = 'force-dynamic';

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = parseMembershipQuery(await searchParams);

  let data: MembershipHistory;
  try {
    data = await fetchMembershipHistory(q);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">멤버십 이력을 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const pages = totalPages(data.total, q.limit);
  const href = (page: number) =>
    `/membership${membershipQueryString({ status: q.status, search: q.search, page })}`;
  const linkCls =
    'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-ink-subtle hover:text-ink';

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">멤버십 결제 · 업그레이드 이력 (총 {data.total}건)</h2>
      <FilterBar status={q.status ?? ''} search={q.search ?? ''} />
      <MembershipHistoryTable rows={data.rows} />
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
        조회 전용 · 이메일 마스킹 · KST. 결제는 크레딧 기반(PG 미연동 POC) — 청구=정가, 결제=크레딧 차감. ‘샘플’ 메모는 시연용 데이터.
      </p>
    </div>
  );
}
