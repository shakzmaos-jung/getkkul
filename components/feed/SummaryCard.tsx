'use client';

import { useState } from 'react';
import { translateSummary, type TranslatedSummary } from '@/app/feed/actions';
import type { LengthMode } from '@/lib/summary/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Props {
  videoId: string;
  mode: LengthMode;
  title: string;
  url: string;
  channelTitle: string;
  ko: TranslatedSummary;
}

export default function SummaryCard({ videoId, mode, title, url, channelTitle, ko }: Props) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [en, setEn] = useState<TranslatedSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = lang === 'en' && en ? en : ko;

  async function toggle() {
    if (lang === 'en') {
      setLang('ko');
      return;
    }
    if (en) {
      setLang('en');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await translateSummary(videoId, mode); // AC-D3.1/D3.2
      setEn(result);
      setLang('en');
    } catch {
      setError('영어 전환에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
          <h3 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">
            {shown.headline}
          </h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggle}
          disabled={loading}
          data-testid="toggle-language"
          className="shrink-0"
        >
          {loading ? '…' : lang === 'en' ? '한국어' : 'EN'}
        </Button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{shown.coreText}</p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {shown.bullets.map((b, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-4 border-t border-border pt-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          title={title}
        >
          원본 영상
          <span aria-hidden>↗</span>
        </a>
      </div>
    </Card>
  );
}
