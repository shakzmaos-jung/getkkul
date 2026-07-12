'use client';

import { useToast } from '@/components/ui/ToastProvider';

/** 앱 링크 공유 버튼. 클릭 시 링크 복사 + 하단 토스트. */
export default function ShareButton() {
  const showToast = useToast();

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
    } catch {
      // 클립보드 실패해도 토스트는 띄운다
    }
    showToast('링크가 공유되었습니다');
  }

  return (
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
  );
}
