import {
  formatDuration,
  channelTotals,
  deliverStageSubLabel,
  retryQueueTotal,
} from '@/lib/pipeline/derive';
import type {
  ChannelProcessing,
  PipelineStage,
  RetryQueue as RetryQueueT,
} from '@/lib/pipeline/types';

// 각 단계의 대표 건수 키(표시용).
const HEADLINE_COUNT: Record<string, { key: string; label: string }> = {
  detect: { key: 'registered', label: '신규 감지' },
  acquire: { key: 'done', label: '수집 완료' },
  summarize: { key: 'generated', label: '요약 생성' },
  deliver: { key: 'delivered', label: '발송' },
};

function stageOkView(ok: boolean | null) {
  if (ok === null) return { icon: '·', cls: 'text-ink-tertiary' };
  return ok ? { icon: '●', cls: 'text-ok' } : { icon: '▲', cls: 'text-crit' };
}

export function StageTimeline({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto">
      {stages.map((s, i) => {
        const head = HEADLINE_COUNT[s.key];
        const headline = head ? (s.counts[head.key] ?? 0) : null;
        const view = stageOkView(s.ok);
        // 발송 단계는 성공률(AC-PI-1c) + 실패 건수를 노출한다.
        const subLabel = deliverStageSubLabel(s) ?? head?.label;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`min-w-36 rounded-md border px-4 py-3 ${
                s.ok === false ? 'border-crit/40 bg-crit/10' : 'border-hairline bg-surface-2'
              }`}
            >
              <div className="flex items-center justify-between text-sm text-ink">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className={view.cls}>
                    {view.icon}
                  </span>
                  {s.label}
                </span>
                <span className="text-xs text-ink-tertiary">{formatDuration(s.durationSec)}</span>
              </div>
              <div className="mt-1 text-lg font-semibold text-ink">{headline ?? '—'}</div>
              {subLabel && <div className="text-xs text-ink-subtle">{subLabel}</div>}
            </div>
            {i < stages.length - 1 && (
              <span aria-hidden className="self-center text-ink-tertiary">
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RetryQueue({ rq }: { rq: RetryQueueT }) {
  const cells = [
    { label: '재시도 대기', value: rq.dueNow + rq.waiting, tone: 'text-warn' },
    { label: '영구 실패', value: rq.permanentFailures, tone: 'text-crit' },
    { label: '재시도 소진', value: rq.exhaustedTransient, tone: 'text-crit' },
  ];
  const total = retryQueueTotal(rq);
  return (
    <div className="space-y-4">
      <div className="text-xs text-ink-tertiary">총 {total}건 (대기·실패)</div>
      <div className="grid grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-hairline bg-surface-1 p-4">
            <div className="text-xs text-ink-subtle">{c.label}</div>
            <div className={`mt-1 text-xl font-semibold ${c.value > 0 ? c.tone : 'text-ink'}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
      {rq.samples.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-subtle">
              <tr className="border-b border-hairline">
                <th className="px-3 py-2 font-medium">영상</th>
                <th className="px-3 py-2 font-medium">유형</th>
                <th className="px-3 py-2 font-medium">재시도</th>
                <th className="px-3 py-2 font-medium">사유</th>
              </tr>
            </thead>
            <tbody>
              {rq.samples.map((s, i) => (
                <tr key={i} className="border-b border-hairline/50">
                  <td className="max-w-56 truncate px-3 py-2 text-ink">{s.title}</td>
                  <td className="px-3 py-2 text-ink-subtle">
                    {s.failureKind === 'permanent' ? '영구' : s.failureKind === 'transient' ? '일시' : '—'}
                  </td>
                  <td className="px-3 py-2 text-ink-subtle">{s.retryCount}</td>
                  <td className="max-w-72 truncate px-3 py-2 text-ink-tertiary">{s.lastError ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ChannelTable({ data }: { data: ChannelProcessing }) {
  const totals = channelTotals(data.channels);
  const cols: { key: keyof typeof totals; label: string }[] = [
    { key: 'new', label: '신규' },
    { key: 'summarized', label: '요약' },
    { key: 'pending', label: '대기' },
    { key: 'processing', label: '처리중' },
    { key: 'failed', label: '실패' },
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-ink-subtle">
          <tr className="border-b border-hairline">
            <th className="px-3 py-2 font-medium">채널 ({data.channels.length})</th>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.channels.map((ch) => (
            <tr key={ch.channelId} className="border-b border-hairline/50">
              <td className="max-w-64 truncate px-3 py-2 text-ink">{ch.channelTitle}</td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-right tabular-nums ${
                    c.key === 'failed' && ch.failed > 0 ? 'text-crit' : 'text-ink-subtle'
                  }`}
                >
                  {ch[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-hairline-strong text-ink">
            <td className="px-3 py-2 text-xs font-medium text-ink-subtle">합계</td>
            {cols.map((c) => (
              <td key={c.key} className="px-3 py-2 text-right font-semibold tabular-nums">
                {totals[c.key]}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
