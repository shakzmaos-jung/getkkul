import { KPICard } from '@/components/overview/widgets';
import { formatPct, formatKrw, funnelRates } from '@/lib/growth/derive';
import type { GrowthMetrics } from '@/lib/growth/types';

export function GrowthCards({ g }: { g: GrowthMetrics }) {
  const { subscribers: s, activation } = g;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KPICard label="활성 구독자" value={String(s.active)} sub={`총 가입 ${s.totalSignups}`} />
      <KPICard label="신규 가입" value={`+${s.newLast7d}`} sub={`7일 · 30일 +${s.newLast30d}`} />
      <KPICard
        label="활성화율"
        value={formatPct(activation.rate)}
        sub="발송 기준 (오픈 추적 없음)"
      />
      <KPICard label="이탈(순감)" value="미추적" sub="계정 삭제 흔적 없음" muted />
    </div>
  );
}

export function FunnelView({ g }: { g: GrowthMetrics }) {
  const { funnel } = g;
  const { subscribeRate, deliverRate } = funnelRates(funnel);
  const steps = [
    { label: '가입', value: funnel.signedUp, conv: null as string | null },
    { label: '구독', value: funnel.subscribed, conv: formatPct(subscribeRate) },
    { label: '발송', value: funnel.delivered, conv: formatPct(deliverRate) },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-10 text-sm text-ink-subtle">{s.label}</span>
          <div className="h-8 flex-1 overflow-hidden rounded-md bg-surface-2">
            <div
              className="flex h-full items-center rounded-md bg-primary/40 px-3 text-sm font-medium text-ink"
              style={{ width: `${Math.max(8, (s.value / max) * 100)}%` }}
            >
              {s.value}
            </div>
          </div>
          <span className="w-16 text-right text-xs text-ink-tertiary">
            {i === 0 ? '' : `→ ${s.conv}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CohortTable({ g }: { g: GrowthMetrics }) {
  if (g.cohorts.length === 0) {
    return <div className="text-sm text-ink-subtle">코호트 없음</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">가입 주차</th>
            <th className="px-3 py-2 text-right font-medium">코호트 크기</th>
            <th className="px-3 py-2 text-right font-medium">유지 중</th>
            <th className="px-3 py-2 text-right font-medium">유지율</th>
          </tr>
        </thead>
        <tbody>
          {g.cohorts.map((c) => (
            <tr key={c.week} className="border-b border-hairline/50">
              <td className="px-3 py-2 text-ink">{c.week}</td>
              <td className="px-3 py-2 text-right tabular-nums text-ink-subtle">{c.size}</td>
              <td className="px-3 py-2 text-right tabular-nums text-ink-subtle">{c.stillActive}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium text-ink">
                {formatPct(c.retentionRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[11px] text-ink-tertiary">
        유지율 = 구독 유지 기준 proxy (오픈/재방문 추적 없음).
      </p>
    </div>
  );
}

export function ReferralKillSwitch({ g }: { g: GrowthMetrics }) {
  const r = g.referral;
  const pct = r.budgetCap > 0 ? (r.totalIssued / r.budgetCap) * 100 : 0;
  return (
    <div className="space-y-3 rounded-lg border border-hairline bg-surface-1 p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink">레퍼럴 예산 소진 (킬스위치)</span>
        <span className="text-ink-subtle">
          {formatKrw(r.totalIssued)} / {formatKrw(r.budgetCap)} ({formatPct(r.soakRate)})
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
        <div
          className={`h-full rounded-pill ${pct >= 80 ? 'bg-crit' : pct >= 50 ? 'bg-warn' : 'bg-primary'}`}
          style={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="flex gap-6 text-xs text-ink-tertiary">
        <span>1인 상한 {formatKrw(r.perUserCap)}</span>
        <span>보상 {formatKrw(r.rewardAmount)}/건</span>
        <span>활성 레퍼럴 {r.activated}/{r.totalReferrals}</span>
        <span>{r.active ? '운영 중' : '중단'}</span>
      </div>
    </div>
  );
}
