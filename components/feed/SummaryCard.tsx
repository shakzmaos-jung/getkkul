'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { setVideoLength } from '@/app/feed/actions';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

interface Props {
  videoId: string;
  channelTitle: string;
  title: string;
  url: string;
  publishedAt: string | null;
  initialMode: LengthMode;
  summaries: Partial<Record<LengthMode, ModeSummary>>;
}

const MODES: { mode: LengthMode; label: string }[] = [
  { mode: 'short', label: '짧게' },
  { mode: 'normal', label: '보통' },
  { mode: 'long', label: '길게' },
];

/** 영상 업데이트 일시(published_at, UTC)를 KST yyyy-mm-dd hh:mm 으로. */
function formatKstDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export default function SummaryCard({
  videoId,
  channelTitle,
  title,
  url,
  publishedAt,
  initialMode,
  summaries,
}: Props) {
  const [mode, setMode] = useState<LengthMode>(initialMode);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const shown = summaries[mode] ??
    summaries.normal ??
    summaries.short ??
    summaries.long ?? { coreText: '', bullets: [] };
  const hasBullets = shown.bullets.length > 0;

  function pick(m: LengthMode) {
    if (m === mode) return;
    setMode(m);
    setExpanded(false);
    startTransition(() => setVideoLength(videoId, m)); // 영상별·계정 저장(최신값)
  }

  return (
    <Card data-testid="summary-card" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {channelTitle && (
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              <p data-testid="channel-label" className="text-xs font-medium text-muted-foreground">
                {channelTitle}
              </p>
            </div>
          )}
          <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">{title}</h3>
          {publishedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              업데이트 {formatKstDateTime(publishedAt)}
            </p>
          )}
        </div>

        <div
          role="group"
          aria-label="요약 길이"
          className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5"
        >
          {MODES.map((o) => {
            const active = o.mode === mode;
            const disabled = !summaries[o.mode];
            return (
              <button
                key={o.mode}
                type="button"
                disabled={disabled}
                data-testid={`card-length-${o.mode}`}
                onClick={() => pick(o.mode)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>

      {hasBullets && (
        <>
          {expanded && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {shown.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            data-testid="toggle-bullets"
            aria-expanded={expanded}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? '접기 ▴' : '상세 보기 ▾'}
          </button>
        </>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          원본 영상 <span aria-hidden>↗</span>
        </a>
      </div>
    </Card>
  );
}
