'use client';

import { useEffect, useState } from 'react';
import { removeSubscription, setSubscriptionPause } from '@/app/subscriptions/actions';
import { Button } from '@/components/ui/Button';

/**
 * 구독 행 액션: [일시정지/정지해제] [삭제].
 * - 일시정지/정지해제: 현재 상태의 반대값으로 서버 액션 제출.
 * - 삭제: 확인 모달(삭제/취소). 배경 클릭·ESC 로 닫힘.
 */
export default function SubscriptionRowActions({
  id,
  paused,
  title,
}: {
  id: string;
  paused: boolean;
  title: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* 일시정지 / 정지해제 */}
      <form action={setSubscriptionPause}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="paused" value={paused ? 'false' : 'true'} />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          data-testid="toggle-pause-subscription"
        >
          {paused ? '정지해제' : '일시정지'}
        </Button>
      </form>

      {/* 삭제(모달 확인) */}
      <Button
        type="button"
        variant="danger"
        size="sm"
        data-testid="open-remove-modal"
        onClick={() => setConfirmOpen(true)}
      >
        삭제
      </Button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="채널 삭제 확인"
            className="w-full max-w-xs rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium">채널을 삭제할까요?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              이 삭제를 누르면 <span className="text-foreground">{title}</span> 채널을 삭제합니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                className="h-9 rounded-lg border border-border px-4 text-sm transition-colors hover:bg-muted"
              >
                취소
              </button>
              <form action={removeSubscription}>
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  data-testid="remove-subscription"
                  className="h-9 rounded-lg bg-danger px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  삭제
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
