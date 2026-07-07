'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** 앱 링크 공유 버튼. 클릭 시 링크 복사 + 하단에서 튀어오르는 토스트(2.5초). */
export default function ShareButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(t);
  }, [show]);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      // 클립보드 실패해도 토스트는 띄운다
    }
    setShow(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label="공유하기"
        title="공유하기"
        data-testid="share-app"
        className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
      </button>
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            className={`pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
              show ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
              링크가 공유되었습니다
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
