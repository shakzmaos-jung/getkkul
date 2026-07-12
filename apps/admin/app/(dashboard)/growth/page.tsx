import { fetchGrowthMetrics } from '@/lib/growth/fetch';
import {
  GrowthCards,
  FunnelView,
  CohortTable,
  ReferralKillSwitch,
} from '@/components/growth/widgets';
import type { GrowthMetrics } from '@/lib/growth/types';

export const dynamic = 'force-dynamic';

export default async function GrowthPage() {
  let g: GrowthMetrics;
  try {
    g = await fetchGrowthMetrics();
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">그로스 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <GrowthCards g={g} />
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">획득 퍼널 (가입→구독→발송)</h2>
        <FunnelView g={g} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">코호트 리텐션</h2>
        <CohortTable g={g} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">레퍼럴</h2>
        <ReferralKillSwitch g={g} />
      </section>
    </div>
  );
}
