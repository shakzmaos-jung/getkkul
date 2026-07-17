'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GlossaryEntry } from '@/lib/feed/render-terms';

/**
 * 인라인 용어 클릭 → 정의 팝오버. 한 스팬을 덮는 엔트리들(동음이의·중첩)을 모두 나열한다.
 * 각 엔트리 헤더는 `한글 · 영어`(있는 것만). InfoTooltip 패턴 재사용(탭 열림·body 포털·바깥탭/ESC/스크롤 닫힘,
 * 뷰포트 클램프). 정의는 사전계산 값이라 즉시 표시. 밑줄을 또렷하게 강조(가독).
 */
export function TermTooltip({ entries, surface }: { entries: GlossaryEntry[]; surface: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      const margin = 8;
      const width = Math.min(300, window.innerWidth - margin * 2);
      const left = Math.max(margin, Math.min(b.left, window.innerWidth - width - margin));
      setPos({ top: b.bottom + 6, left, width });
    };
    place();
    const close = () => setOpen(false);
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const label = (e: GlossaryEntry) => [e.termKo, e.termEn].filter(Boolean).join(' · ');

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${surface} 정의 보기`}
        aria-expanded={open}
        data-testid="term-trigger"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="cursor-help rounded-[2px] font-medium text-accent underline decoration-accent/80 decoration-2 underline-offset-2 transition-colors hover:bg-accent/10 hover:decoration-accent"
      >
        {surface}
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            ref={popRef}
            role="tooltip"
            data-testid="term-tooltip-content"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-[70] block rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-foreground shadow-xl"
          >
            {entries.map((e, i) => (
              <span
                key={e.id}
                className={i > 0 ? 'mt-2 block border-t border-border pt-2' : 'block'}
              >
                <span className="mb-0.5 block font-semibold text-accent">
                  {entries.length > 1 ? `${i + 1}. ${label(e)}` : label(e)}
                </span>
                {e.definition}
              </span>
            ))}
          </span>,
          document.body,
        )}
    </>
  );
}
