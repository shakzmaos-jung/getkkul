import type { CheckStatus, SecurityCheck } from '@/lib/security/checks';

// 색 + 텍스트 병기(접근성).
const STATUS: Record<CheckStatus, { label: string; cls: string; icon: string }> = {
  ok: { label: '양호', cls: 'text-ok', icon: '●' },
  warn: { label: '주의', cls: 'text-warn', icon: '▲' },
  crit: { label: '위험', cls: 'text-crit', icon: '■' },
  unconfigured: { label: '미구성', cls: 'text-ink-tertiary', icon: '○' },
};

export function SecurityCheckList({ checks }: { checks: SecurityCheck[] }) {
  return (
    <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-1">
      {checks.map((c) => {
        const s = STATUS[c.status];
        return (
          <div key={c.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink">{c.label}</div>
              <div className="mt-0.5 text-xs text-ink-subtle">{c.detail}</div>
            </div>
            <span className={`flex shrink-0 items-center gap-1.5 text-sm ${s.cls}`}>
              <span aria-hidden>{s.icon}</span>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
