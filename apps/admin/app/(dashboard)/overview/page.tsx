import { fetchOverview } from '@/lib/overview/fetch';
import {
  serviceStatus,
  stageStatuses,
  batchSuccessRate,
  SERVICE_STATUS_LABEL,
} from '@/lib/overview/derive';
import { StatusSignal, BatchStrip, KPICard } from '@/components/overview/widgets';
import { fetchCostBreakdown } from '@/lib/cost/fetch';
import { totalUsd, formatUsd } from '@/lib/cost/derive';

// 실시간 관제 데이터 — 빌드 프리렌더 금지, 매 요청 서버 조회(REQ-NFR-1 신선도).
export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  let data;
  try {
    data = await fetchOverview();
  } catch (e) {
    // 위젯 격리(REQ-ST-1 error): 화면 전체를 깨지 않고 실패 사유 + 재시도 안내.
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">관제 홈 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
          <p className="mt-3 text-xs text-ink-tertiary">
            service_role 키(SUPABASE_SERVICE_ROLE_KEY)·RPC 권한을 확인하세요. 새로고침으로 재시도.
          </p>
        </div>
      </div>
    );
  }

  const status = serviceStatus(data.health);
  const stages = stageStatuses(data.health);
  const rate = batchSuccessRate(data.health);
  const okStages = stages.filter((s) => s.ok).length;
  const { subscribers } = data;

  // ⑤ 이번달 LLM 비용(M4 연동). 실패해도 화면 전체를 깨지 않고 미연동 표시.
  let monthUsd: number | null = null;
  try {
    const kstToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    const monthStart = `${kstToday.slice(0, 8)}01`;
    monthUsd = totalUsd(await fetchCostBreakdown(monthStart));
  } catch {
    monthUsd = null;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusSignal status={status} />
        <span className="text-xs text-ink-tertiary">기준 {data.health.nowKst} KST</span>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">오늘 배치</h2>
        <BatchStrip stages={stages} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">KPI</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KPICard label="서비스 상태" value={SERVICE_STATUS_LABEL[status]} />
          <KPICard
            label="오늘 배치 성공률"
            value={`${Math.round(rate * 100)}%`}
            sub={`정상 단계 ${okStages}/4`}
          />
          <KPICard
            label="활성 구독자"
            value={String(subscribers.active)}
            sub={`+${subscribers.newLast7d} 순증 (7일)`}
          />
          <KPICard label="이메일 오픈율" value="미연동" sub="오픈 추적 미도입" muted />
          <KPICard
            label="이번달 LLM 비용"
            value={monthUsd === null ? '미연동' : formatUsd(monthUsd)}
            sub={monthUsd === null ? '조회 실패' : 'gpt-5-nano 실측'}
            muted={monthUsd === null}
          />
          <KPICard label="열린 인시던트" value="미연동" sub="M7 인시던트에서" muted />
        </div>
      </section>
    </div>
  );
}
