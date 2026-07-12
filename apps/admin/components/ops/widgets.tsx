import type { OpsData } from '@/lib/ops/types';

export function SubscriberTable({ subscribers }: { subscribers: OpsData['subscribers'] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">구독자 ({subscribers.length})</th>
            <th className="px-3 py-2 font-medium">가입일</th>
            <th className="px-3 py-2 text-right font-medium">활성 구독</th>
            <th className="px-3 py-2 font-medium">멤버십</th>
          </tr>
        </thead>
        <tbody>
          {subscribers.map((s, i) => (
            <tr key={i} className="border-b border-hairline/50">
              <td className="px-3 py-2 font-mono text-ink">{s.email}</td>
              <td className="px-3 py-2 text-ink-subtle">{s.signupAt}</td>
              <td className="px-3 py-2 text-right tabular-nums text-ink-subtle">{s.activeSubs}</td>
              <td className="px-3 py-2 text-ink-subtle">{s.membership ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DigestHistory({ digests }: { digests: OpsData['recentDigests'] }) {
  if (digests.length === 0) {
    return <div className="text-sm text-ink-subtle">다이제스트 이력 없음</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">시각</th>
            <th className="px-3 py-2 font-medium">구독자</th>
            <th className="px-3 py-2 font-medium">슬롯</th>
            <th className="px-3 py-2 font-medium">채널</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">영상</th>
          </tr>
        </thead>
        <tbody>
          {digests.map((d, i) => (
            <tr key={i} className="border-b border-hairline/50">
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{d.atKst}</td>
              <td className="px-3 py-2 font-mono text-ink-subtle">{d.email}</td>
              <td className="px-3 py-2 text-ink-subtle">{d.slot}</td>
              <td className="px-3 py-2 text-ink-subtle">{d.channel}</td>
              <td
                className={`px-3 py-2 ${
                  d.status === 'sent' ? 'text-ok' : d.status === 'failed' ? 'text-crit' : 'text-ink-subtle'
                }`}
              >
                {d.status}
              </td>
              <td className="max-w-80 truncate px-3 py-2 text-ink">{d.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
