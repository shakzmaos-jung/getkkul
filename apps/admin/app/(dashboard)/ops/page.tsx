import { fetchOpsData } from '@/lib/ops/fetch';
import { SubscriberTable, DigestHistory } from '@/components/ops/widgets';
import type { OpsData } from '@/lib/ops/types';

export const dynamic = 'force-dynamic';

export default async function OpsPage() {
  let ops: OpsData;
  try {
    ops = await fetchOpsData();
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">운영 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">구독자 (이메일 마스킹)</h2>
        <SubscriberTable subscribers={ops.subscribers} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">다이제스트 이력</h2>
        <DigestHistory digests={ops.recentDigests} />
      </section>
      <p className="text-xs text-ink-tertiary">
        조회 전용. 다이제스트 재발송·파이프라인 수동 실행(부수효과 있는 파괴적 액션)은 미포함 —
        후속(사용자 결정: 조회만 먼저). 도입 시 서버 권한 재검증 + 확인 다이얼로그 + 멱등 필수.
      </p>
    </div>
  );
}
