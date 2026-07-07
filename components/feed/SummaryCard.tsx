'use client';

import { useState, useTransition } from 'react';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { setVideoLength } from '@/app/feed/actions';
import { formatDuration } from '@/lib/youtube/duration';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

interface Props {
  videoId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelHandle: string | null;
  title: string;
  url: string;
  publishedAt: string | null;
  durationSeconds: number | null;
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
  channelThumbnail,
  channelHandle,
  title,
  url,
  publishedAt,
  durationSeconds,
  initialMode,
  summaries,
}: Props) {
  const duration = formatDuration(durationSeconds);
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
    <Card id={`d-${videoId}`} data-testid="summary-card" className="scroll-mt-20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {channelTitle && (
            <div className="flex items-center gap-2">
              <ChannelAvatar src={channelThumbnail} title={channelTitle} size={20} />
              <div className="flex min-w-0 items-baseline gap-1.5">
                <p data-testid="channel-label" className="truncate text-xs font-medium text-muted-foreground">
                  {channelTitle}
                </p>
                {channelHandle && (
                  <span className="truncate text-[11px] text-muted-foreground/60">
                    {channelHandle}
                  </span>
                )}
              </div>
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

      {hasBullets ? (
        /* 본문/상세 영역을 탭하면 접기·펼치기 (요청: 메인 본문·상세 영역 터치 토글). */
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          data-testid="summary-body"
          className="mt-3 -mx-1 cursor-pointer select-none rounded-md px-1 py-0.5 transition-colors hover:bg-muted/40"
        >
          <p className="text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>
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
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>
      )}

      {hasBullets && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid="toggle-bullets"
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {expanded ? '접기 ▴' : '상세 보기 ▾'}
        </button>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          원본 영상 <span aria-hidden>↗</span>
        </a>
        {duration && (
          <span className="text-xs tabular-nums text-muted-foreground/70" aria-label="영상 길이">
            · {duration}
          </span>
        )}
      </div>
    </Card>
  );
}
