import type { MembershipHistory } from '@/lib/membership/types';

const PLAN_LABEL: Record<string, string> = { free: 'Free', small: 'Small', medium: 'Medium', large: 'Large' };
const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: '결제 완료', cls: 'bg-ok/15 text-ok' },
  failed: { label: '실패', cls: 'bg-crit/15 text-crit' },
  grace: { label: '유예', cls: 'bg-warn/15 text-warn' },
  skipped_free: { label: 'PoC 무료', cls: 'bg-surface-2 text-ink-subtle' },
  proration: { label: '비례정산', cls: 'bg-primary/15 text-primary' },
};
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const plan = (c: string | null) => (c ? (PLAN_LABEL[c] ?? c) : '—');

export function MembershipHistoryTable({ rows }: { rows: MembershipHistory['rows'] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-subtle">조건에 맞는 이력이 없습니다.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">결제일(KST)</th>
            <th className="px-3 py-2 font-medium">사용자</th>
            <th className="px-3 py-2 font-medium">구독 기간</th>
            <th className="px-3 py-2 font-medium">플랜</th>
            <th className="px-3 py-2 font-medium">청구</th>
            <th className="px-3 py-2 font-medium">결제(크레딧)</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">현재</th>
            <th className="px-3 py-2 font-medium">메모</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, cls: 'bg-surface-2 text-ink-subtle' };
            return (
              <tr key={r.id} className="border-b border-hairline/50 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{r.atKst}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-subtle">{r.email ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{r.billingPeriod}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink">{plan(r.planCode)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-subtle">{won(r.amount)}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-subtle">{won(r.creditUsed)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className={`rounded-pill px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-tertiary">
                  {plan(r.currentPlan)} · {r.currentStatus ?? '—'}
                </td>
                <td className="max-w-40 truncate px-3 py-2 text-xs text-ink-tertiary">{r.memo ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
