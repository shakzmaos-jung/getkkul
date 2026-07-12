import { fetchCostBreakdown } from '@/lib/cost/fetch';
import { CostCards, DailyUsdBars } from '@/components/cost/widgets';
import type { CostBreakdown } from '@/lib/cost/types';

export const dynamic = 'force-dynamic';

export default async function CostPage() {
  let cb: CostBreakdown;
  try {
    cb = await fetchCostBreakdown();
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">비용 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <CostCards cb={cb} />
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">일별 LLM 비용 (USD)</h2>
        <DailyUsdBars cb={cb} />
      </section>
      <p className="text-xs text-ink-tertiary">
        비용 = 실측 토큰 × 가격표(packages/domain). 모드별(짧게/보통/길게) 분리는 토큰이 배치 단위
        기록이라 미제공. 캐시 토큰 단가는 별도 계측 시 반영.
      </p>
    </div>
  );
}
