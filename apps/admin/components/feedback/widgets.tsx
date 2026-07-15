import type { FeedbackEvents } from '@/lib/feedback/types';

const MODE_LABEL: Record<string, string> = { short: '간단히', normal: '자세히', long: '최대한' };

export function FeedbackTable({ rows }: { rows: FeedbackEvents['rows'] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-subtle">조건에 맞는 이벤트가 없습니다.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">시각(KST)</th>
            <th className="px-3 py-2 font-medium">사용자</th>
            <th className="px-3 py-2 font-medium">채널</th>
            <th className="px-3 py-2 font-medium">영상</th>
            <th className="px-3 py-2 font-medium">반응</th>
            <th className="px-3 py-2 font-medium">요약</th>
            <th className="px-3 py-2 font-medium">사유</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline/50 align-top">
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">{r.atKst}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-subtle">{r.email}</td>
              <td className="max-w-40 truncate px-3 py-2 text-ink-subtle">{r.channelTitle ?? '—'}</td>
              <td className="max-w-64 truncate px-3 py-2 text-ink">{r.videoTitle}</td>
              <td className={`whitespace-nowrap px-3 py-2 ${r.rating === 'down' ? 'text-crit' : 'text-ok'}`}>
                {r.rating === 'down' ? '👎 싫어요' : '👍 좋아요'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-subtle">
                {MODE_LABEL[r.lengthMode] ?? r.lengthMode}
              </td>
              <td className="max-w-80 whitespace-pre-wrap px-3 py-2 text-ink-subtle">{r.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
