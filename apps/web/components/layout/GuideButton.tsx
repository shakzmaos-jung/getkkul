'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import type { ScreenGuide } from '@/components/layout/screen-guides';

/**
 * 화면 타이틀 우측 '이용 가이드' 뱃지. 누르면 화면 설명 + 사용법을 포털 다이얼로그로 연다
 * (백드롭/Escape/닫기 버튼으로 닫힘). 헤더(AppHeader)에서 현재 화면 가이드와 함께 렌더.
 */
export default function GuideButton({ guide }: { guide: ScreenGuide }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="guide-badge"
        aria-label="가이드 열기"
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        가이드
      </button>

      {open && <GuideDialog guide={guide} onClose={() => setOpen(false)} />}
    </>
  );
}

function GuideDialog({ guide, onClose }: { guide: ScreenGuide; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${guide.title} 이용 가이드`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold tracking-tight">{guide.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.description}</p>

        <ul className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
          {guide.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border" aria-hidden />
              <span className="min-w-0">{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose} data-testid="guide-close">
            닫기
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
