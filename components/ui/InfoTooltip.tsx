'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ⓘ 탭 툴팁 — hover 아님, **탭(클릭)으로 열림**(모바일 발견성). 재탭·바깥 탭·ESC·스크롤로 닫힘.
 * 팝오버는 트리거 위치를 측정해 `fixed` 로 렌더하고 좌우를 뷰포트 안으로 클램프한다
 * (모바일/PC 어디서도 화면 밖으로 삐져나가지 않음). 배경은 완전 불투명.
 */
export function InfoTooltip({ label, text }: { label: string; text: string }) {
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
      const width = Math.min(240, window.innerWidth - margin * 2); // 15rem
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

  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
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
      {/* body 로 포털 — 잠금 카드의 opacity(투명) 상속을 피해 불투명하게, 뷰포트 안으로 클램프. */}
      {open &&
        pos &&
        createPortal(
          <span
            ref={popRef}
            role="tooltip"
            data-testid="info-tooltip-content"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-[70] rounded-lg border border-border bg-card p-3 text-xs leading-relaxed text-foreground shadow-xl"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
