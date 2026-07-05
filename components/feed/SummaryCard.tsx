'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface Props {
  channelTitle: string;
  title: string;
  url: string;
  publishedAt: string | null;
  coreText: string;
  bullets: string[];
}

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

export default function SummaryCard({ channelTitle, title, url, publishedAt, coreText, bullets }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBullets = bullets.length > 0;

  return (
    <Card data-testid="summary-card" className="p-5">
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

      <p className="mt-3 text-sm leading-relaxed text-foreground/80">{coreText}</p>

      {hasBullets && (
        <>
          {expanded && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {bullets.map((b, i) => (
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
