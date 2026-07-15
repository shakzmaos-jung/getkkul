import { CURRENT_VERSION, prUrl } from '@/lib/versions/data';
import type { VersionEntry } from '@/lib/versions/types';

const TYPE_BADGE: Record<VersionEntry['type'], { label: string; cls: string }> = {
  major: { label: 'MAJOR', cls: 'text-crit' },
  minor: { label: 'MINOR', cls: 'text-ok' },
  patch: { label: 'PATCH', cls: 'text-ink-subtle' },
  baseline: { label: 'BASELINE', cls: 'text-ink-tertiary' },
};

export function VersionTable({ rows }: { rows: VersionEntry[] }) {
  if (rows.length === 0) {
    return <div className="text-sm text-ink-subtle">조건에 맞는 버전이 없습니다.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">버전</th>
            <th className="px-3 py-2 font-medium">날짜</th>
            <th className="px-3 py-2 font-medium">요약</th>
            <th className="px-3 py-2 font-medium">개발자 설명</th>
            <th className="px-3 py-2 font-medium">비개발자 설명</th>
            <th className="px-3 py-2 font-medium">사용자 영향</th>
            <th className="px-3 py-2 font-medium">PR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const badge = TYPE_BADGE[e.type];
            const isCurrent = e.version === CURRENT_VERSION;
            return (
              <tr key={e.version} className="border-b border-hairline/50 align-top">
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-ink">v{e.version}</span>
                    {isCurrent && (
                      <span title="현재 버전" className="text-warn">
                        ★
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-subtle">{e.date}</td>
                <td className="min-w-48 max-w-64 px-3 py-2 text-ink">{e.summary}</td>
                <td className="min-w-56 max-w-80 whitespace-pre-wrap px-3 py-2 text-ink-subtle">{e.dev}</td>
                <td className="min-w-56 max-w-80 whitespace-pre-wrap px-3 py-2 text-ink-subtle">{e.nonDev}</td>
                <td className="min-w-48 max-w-72 whitespace-pre-wrap px-3 py-2 text-ink-subtle">{e.userImpact}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  {e.prs.length === 0 ? (
                    <span className="text-ink-tertiary">—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {e.prs.map((n) => (
                        <a
                          key={n}
                          href={prUrl(n)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          #{n}
                        </a>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
