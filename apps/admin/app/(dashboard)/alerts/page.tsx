import { fetchIncidentLog } from '@/lib/incidents/fetch';
import { activeIncidents } from '@/lib/incidents/derive';
import {
  ActiveIncidents,
  AlertRules,
  RecentFailures,
} from '@/components/incidents/widgets';
import type { IncidentLog } from '@/lib/incidents/types';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  let log: IncidentLog;
  try {
    log = await fetchIncidentLog();
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">인시던트 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const incidents = activeIncidents(log.health);

  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">활성 인시던트</h2>
        <ActiveIncidents incidents={incidents} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">알림 규칙 (심각 / 보통)</h2>
        <AlertRules />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">최근 실패 ({log.windowDays}일)</h2>
        <RecentFailures log={log} />
      </section>
      <p className="text-xs text-ink-tertiary">
        인시던트는 현재 신호에서 파생(무-테이블). 포스트모템·열림/닫힘 추적·상태페이지는 미연동 —
        인시던트 테이블 신설 시 후속.
      </p>
    </div>
  );
}
