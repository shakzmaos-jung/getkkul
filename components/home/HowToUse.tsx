'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  '관심 있는 유튜브 채널을 구독으로 추가하세요.',
  '요약 길이(짧게·보통·길게)와 알림 채널을 설정하세요.',
  '07:30 · 11:30 · 17:30에 다이제스트가 자동으로 도착합니다.',
];

/** 사용법 접이식(기본 접힘). */
export default function HowToUse() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="how-to-use"
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted"
      >
        <span className="text-sm font-semibold">어떻게 쓰나요?</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ol className="flex flex-col gap-3 border-t border-border px-5 py-4">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
