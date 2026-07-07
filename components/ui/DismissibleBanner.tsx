'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * 닫을 수 있는 배너(홈 소개/다이제스트/채널 공용). 닫으면 localStorage 로 유지한다.
 * 초기값 확정 전엔 렌더하지 않아 깜빡임(닫힌 배너가 잠깐 보임)을 막는다.
 */
export default function DismissibleBanner({
  storageKey,
  title,
  description,
  icon,
}: {
  storageKey: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    // 클라이언트 저장값 1회 반영
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (dismissed !== false) return null;

  function close() {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* noop */
    }
    setDismissed(true);
  }

  return (
    <div className="relative rounded-xl border border-accent/30 bg-accent/10 p-4 pr-10">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-2xl leading-none" aria-hidden>
            {icon}
          </span>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <button
        type="button"
        onClick={close}
        aria-label="배너 닫기"
        title="닫기"
        data-testid="banner-dismiss"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
