'use client';

import { useState } from 'react';
import { translateSummary, type TranslatedSummary } from '@/app/feed/actions';
import type { LengthMode } from '@/lib/summary/format';

interface Props {
  videoId: string;
  mode: LengthMode;
  title: string;
  url: string;
  ko: TranslatedSummary;
}

export default function SummaryCard({ videoId, mode, title, url, ko }: Props) {
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
    <article data-testid="summary-card" className="border-b py-4">
      <div className="flex items-start justify-between gap-3">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:underline">
          {title}
        </a>
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          data-testid="toggle-language"
          className="shrink-0 rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? '…' : lang === 'en' ? '한국어' : 'English'}
        </button>
      </div>

      <h3 className="mt-1 font-semibold">{shown.headline}</h3>
      <p className="mt-1 text-sm text-gray-700">{shown.coreText}</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
        {shown.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </article>
  );
}
