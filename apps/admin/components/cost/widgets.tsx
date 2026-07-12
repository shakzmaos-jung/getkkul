import { RATIO_BADGE_LABEL, type RatioBadge } from '@getkkul/domain';
import { KPICard } from '@/components/overview/widgets';
import { totalUsd, costRatio, dailyUsd, formatUsd } from '@/lib/cost/derive';
import type { CostBreakdown } from '@/lib/cost/types';

const BADGE_STYLE: Record<RatioBadge, string> = {
  excellent: 'bg-ok/15 text-ok',
  normal: 'bg-info/15 text-info',
  investigate: 'bg-warn/15 text-warn',
  critical: 'bg-crit/15 text-crit',
};

export function CostCards({ cb }: { cb: CostBreakdown }) {
  const total = totalUsd(cb);
  const { ratio, badge } = costRatio(cb);
  const { quota, email, totals } = cb;
  const quotaPct = quota.cap > 0 ? Math.round((quota.unitsUsed / quota.cap) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KPICard label="기간 LLM 비용" value={formatUsd(total)} sub={`${cb.from} ~ ${cb.to} · ${cb.model}`} />
      <div className="rounded-lg border border-hairline bg-surface-1 p-5">
        <div className="text-xs text-ink-subtle">입력:출력 토큰 비율</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink">
            {ratio === null ? '—' : `${ratio.toFixed(1)}:1`}
          </span>
          {badge && (
            <span className={`rounded-pill px-2 py-0.5 text-xs ${BADGE_STYLE[badge]}`}>
              {RATIO_BADGE_LABEL[badge]}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-ink-tertiary">
          입력 {totals.promptTokens.toLocaleString()} · 출력 {totals.completionTokens.toLocaleString()}
        </div>
      </div>
      <KPICard
        label="YouTube 쿼터(오늘)"
        value={`${quota.unitsUsed} / ${quota.cap}`}
        sub={`${quotaPct}% 소진`}
      />
      <KPICard
        label="이메일 발송(기간)"
        value={String(email.sent)}
        sub={email.failed > 0 ? `실패 ${email.failed}` : '실패 0'}
      />
    </div>
  );
}

export function DailyUsdBars({ cb }: { cb: CostBreakdown }) {
  const days = dailyUsd(cb);
  if (days.length === 0) {
    return <div className="text-sm text-ink-subtle">기간 내 요약 실행 없음</div>;
  }
  const max = Math.max(...days.map((d) => d.usd), 0.0001);
  return (
    <div className="flex h-32 items-end gap-1 overflow-x-auto">
      {days.map((d) => (
        <div
          key={d.day}
          className="flex min-w-8 flex-1 flex-col items-center gap-1"
          title={`${d.day}: ${formatUsd(d.usd)}`}
        >
          <div
            className="w-full rounded-t bg-primary/60"
            style={{ height: `${Math.max(2, (d.usd / max) * 100)}%` }}
          />
          <span className="text-[10px] text-ink-tertiary">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}
