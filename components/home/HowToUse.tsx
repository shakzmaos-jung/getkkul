'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

function StepLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="font-medium text-accent underline underline-offset-2 transition-opacity hover:opacity-80"
    >
      {children}
    </Link>
  );
}

const STEPS: ReactNode[] = [
  <>
    관심 있는 유튜브 채널을 <StepLink href="/subscriptions">구독</StepLink>으로 추가하세요.
  </>,
  <>
    <StepLink href="/feed">다이제스트</StepLink>에서 핵심 요약을 만나보세요.
  </>,
  <>이메일 혹은 앱 푸시로 아침(07:30), 점심(11:30), 저녁(17:30)에 알림을 받을 수 있습니다.</>,
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
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
