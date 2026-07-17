import type { SendHistory } from '@/lib/send-history/types';

const SLOT_LABEL: Record<string, string> = { '0730': '07:30', '1130': '11:30', '1730': '17:30', '2130': '21:30' };

function Status({ value }: { value: string | null }) {
  if (value == null) return <span className="text-ink-tertiary">—</span>;
  const cls = value === 'sent' ? 'text-ok' : value === 'failed' ? 'text-crit' : 'text-ink-subtle';
  return <span className={cls}>{value}</span>;
}

export function SendHistoryTable({ rows }: { rows: SendHistory['rows'] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-subtle">조건에 맞는 발송이 없습니다.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">시각(KST)</th>
            <th className="px-3 py-2 font-medium">사용자</th>
            <th className="px-3 py-2 font-medium">슬롯</th>
            <th className="px-3 py-2 text-right font-medium">항목수</th>
            <th className="px-3 py-2 font-medium">이메일</th>
            <th className="px-3 py-2 font-medium">푸시</th>
            <th className="px-3 py-2 font-medium">에러</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline/50 align-top">
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{r.atKst}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-subtle">{r.email}</td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{SLOT_LABEL[r.slot] ?? r.slot}</td>
              <td className="px-3 py-2 text-right tabular-nums text-ink">{r.itemCount}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <Status value={r.emailStatus} />
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <Status value={r.pushStatus} />
              </td>
              <td className="max-w-64 truncate px-3 py-2 text-crit">{r.error ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
