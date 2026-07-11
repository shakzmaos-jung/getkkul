'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ⓘ 탭 툴팁 — hover 아님, **탭(클릭)으로 열림**(모바일 발견성). 재탭·바깥 탭·ESC 로 닫힘.
 * label 은 접근성용(aria-label), text 는 툴팁 본문. 문구는 i18n(messages)에서 주입한다.
 */
export function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        data-testid="info-tooltip-trigger"
        onClick={(e) => {
          // 부모(label/form)의 기본 동작·전파 차단(체크박스 토글·submit 방지).
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          data-testid="info-tooltip-content"
          className="absolute left-0 top-6 z-30 w-60 rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-foreground/85 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </span>
      )}
    </span>
  );
}
