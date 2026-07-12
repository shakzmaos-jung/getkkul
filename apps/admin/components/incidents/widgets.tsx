import {
  SEVERITY_LABEL,
  ALERT_RULES,
  type Incident,
  type Severity,
} from '@/lib/incidents/derive';
import type { IncidentLog } from '@/lib/incidents/types';

const SEV_CLS: Record<Severity, string> = { critical: 'text-crit', normal: 'text-warn' };
const SEV_ICON: Record<Severity, string> = { critical: '■', normal: '▲' };

export function ActiveIncidents({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm text-ok">
        ● 활성 인시던트 없음 · 정상
      </div>
    );
  }
  return (
    <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-1">
      {incidents.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink">{i.label}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">{i.detail}</div>
          </div>
          <span className={`flex shrink-0 items-center gap-1.5 text-sm ${SEV_CLS[i.severity]}`}>
            <span aria-hidden>{SEV_ICON[i.severity]}</span>
            {SEVERITY_LABEL[i.severity]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AlertRules() {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">규칙</th>
            <th className="px-3 py-2 font-medium">발동 조건</th>
            <th className="px-3 py-2 font-medium">심각도</th>
          </tr>
        </thead>
        <tbody>
          {ALERT_RULES.map((r, i) => (
            <tr key={i} className="border-b border-hairline/50">
              <td className="px-3 py-2 text-ink">{r.label}</td>
              <td className="px-3 py-2 text-ink-subtle">{r.trigger}</td>
              <td className={`px-3 py-2 ${SEV_CLS[r.severity]}`}>{SEVERITY_LABEL[r.severity]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecentFailures({ log }: { log: IncidentLog }) {
  if (log.recentFailures.length === 0) {
    return (
      <div className="text-sm text-ink-subtle">최근 {log.windowDays}일 파이프라인 실패 없음</div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">시각</th>
            <th className="px-3 py-2 font-medium">단계</th>
            <th className="px-3 py-2 font-medium">사유</th>
          </tr>
        </thead>
        <tbody>
          {log.recentFailures.map((f, i) => (
            <tr key={i} className="border-b border-hairline/50">
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{f.atKst}</td>
              <td className="px-3 py-2 text-ink">{f.kind}</td>
              <td className="max-w-96 truncate px-3 py-2 text-ink-tertiary">{f.error || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
