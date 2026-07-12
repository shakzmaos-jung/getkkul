import {
  SERVICE_STATUS_LABEL,
  type ServiceStatus,
  type BatchStage,
} from '@/lib/overview/derive';

// 의미색에 텍스트/아이콘 병기(색만으로 상태 전달 금지, 접근성 §13).
const STATUS_STYLE: Record<ServiceStatus, string> = {
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn',
  crit: 'bg-crit/15 text-crit',
};
const STATUS_ICON: Record<ServiceStatus, string> = { ok: '●', warn: '▲', crit: '■' };

export function StatusSignal({ status }: { status: ServiceStatus }) {
  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-medium ${STATUS_STYLE[status]}`}
    >
      <span aria-hidden>{STATUS_ICON[status]}</span>
      <span>서비스 {SERVICE_STATUS_LABEL[status]}</span>
    </div>
  );
}

export function BatchStrip({ stages }: { stages: BatchStage[] }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto">
      {stages.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className={`min-w-28 rounded-md border px-4 py-3 ${
              s.ok ? 'border-hairline bg-surface-2' : 'border-crit/40 bg-crit/10'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sm text-ink">
              <span aria-hidden className={s.ok ? 'text-ok' : 'text-crit'}>
                {s.ok ? '●' : '▲'}
              </span>
              {s.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-ink">
              {s.count ?? '—'}
            </div>
          </div>
          {i < stages.length - 1 && (
            <span aria-hidden className="self-center text-ink-tertiary">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function KPICard({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-5">
      <div className="text-xs text-ink-subtle">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold ${muted ? 'text-ink-tertiary' : 'text-ink'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-tertiary">{sub}</div>}
    </div>
  );
}
