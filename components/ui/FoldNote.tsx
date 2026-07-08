'use client';

import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

/**
 * 접이식 설명 카드(기본 접힘). 홈의 '어떻게 쓰나요?'와 동일 스타일.
 * 각 화면(다이제스트/채널)에서 해당 메뉴를 설명하는 데 재사용한다.
 */
export default function FoldNote({
  title,
  points,
  testId,
}: {
  title: string;
  points: ReactNode[];
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid={testId}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted"
      >
        <span className="text-sm font-semibold">{title}</span>
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
        <ul className="flex flex-col gap-2.5 border-t border-border px-5 py-4">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
