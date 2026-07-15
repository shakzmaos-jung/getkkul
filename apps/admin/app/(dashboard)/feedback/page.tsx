import Link from 'next/link';
import { fetchFeedbackEvents } from '@/lib/feedback/fetch';
import { FeedbackTable } from '@/components/feedback/widgets';
import { FilterBar } from '@/components/feedback/FilterBar';
import { parseFeedbackQuery, totalPages, feedbackQueryString } from '@/lib/feedback/derive';
import type { FeedbackEvents } from '@/lib/feedback/types';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = parseFeedbackQuery(await searchParams);

  let data: FeedbackEvents;
  try {
    data = await fetchFeedbackEvents(q);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">피드백 이력을 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const pages = totalPages(data.total, q.limit);
  const href = (page: number) =>
    `/feedback${feedbackQueryString({ rating: q.rating, search: q.search, page })}`;
  const linkCls =
    'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-ink-subtle hover:text-ink';

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">좋아요 · 싫어요 이벤트 (총 {data.total}건)</h2>
      <FilterBar rating={q.rating ?? ''} search={q.search ?? ''} />
      <FeedbackTable rows={data.rows} />
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
        조회 전용 · 이메일 마스킹 · 사유는 사용자가 남긴 원문. 추가전용 이벤트 로그(반응 변경·취소해도 과거 이벤트 보존).
      </p>
    </div>
  );
}
