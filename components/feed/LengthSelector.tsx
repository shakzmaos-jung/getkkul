'use client';

import { useTransition } from 'react';
import { setSummaryLength } from '@/app/feed/actions';
import type { LengthMode } from '@/lib/summary/format';

const OPTIONS: { mode: LengthMode; label: string }[] = [
  { mode: 'short', label: '짧게' },
  { mode: 'normal', label: '보통' },
  { mode: 'long', label: '길게' },
];

export default function LengthSelector({ current }: { current: LengthMode }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="요약 길이"
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = opt.mode === current;
        return (
          <button
            key={opt.mode}
            type="button"
            disabled={pending}
            data-testid={`feed-length-${opt.mode}`}
            onClick={() => startTransition(() => setSummaryLength(opt.mode))}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
