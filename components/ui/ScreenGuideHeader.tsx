'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';

interface Props {
  title: string;
  description: string;
  points: ReactNode[];
}

/**
 * 화면 상단 헤더: 좌측 타이틀 + 우측 '이용 가이드' 뱃지. 뱃지를 누르면 화면 설명 + 사용법을
 * 다이얼로그로 연다(닫으면 원화면 복귀). 배너·접이식 사용법이 차지하던 세로 공간을 줄인다.
 */
export default function ScreenGuideHeader({ title, description, points }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="guide-badge"
        aria-label="이용 가이드 열기"
        className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
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
        이용 가이드
      </button>

      {open && <GuideDialog title={title} description={description} points={points} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** 포털 다이얼로그(백드롭/Escape/닫기 버튼으로 닫힘). ConfirmDialog·InstallDialog 패턴 미러. */
function GuideDialog({
  title,
  description,
  points,
  onClose,
}: Props & { onClose: () => void }) {
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
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 이용 가이드`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        <ul className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
          {points.map((p, i) => (
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
