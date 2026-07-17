import Link from 'next/link';
import { fetchSendHistory } from '@/lib/send-history/fetch';
import { SendHistoryTable } from '@/components/send-history/widgets';
import { FilterBar } from '@/components/send-history/FilterBar';
import { parseSendQuery, totalPages, sendQueryString } from '@/lib/send-history/derive';
import type { SendHistory } from '@/lib/send-history/types';

export const dynamic = 'force-dynamic';

export default async function SendHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = parseSendQuery(await searchParams);

  let data: SendHistory;
  try {
    data = await fetchSendHistory(q);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">발송 이력을 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const pages = totalPages(data.total, q.limit);
  const href = (page: number) =>
    `/send-history${sendQueryString({ slot: q.slot, status: q.status, search: q.search, page })}`;
  const linkCls =
    'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-ink-subtle hover:text-ink';

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">이메일 · 푸시 발송 이력 (총 {data.total}건)</h2>
      <FilterBar slot={q.slot ?? ''} status={q.status ?? ''} search={q.search ?? ''} />
      <SendHistoryTable rows={data.rows} />
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
        이메일 마스킹 · KST · 슬롯당 사용자 1행(send_log 멱등 클레임). 배포(2026-07-17) 이후 발송분부터 기록.
      </p>
    </div>
  );
}
