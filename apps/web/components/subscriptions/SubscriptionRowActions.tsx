'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeSubscription, setSubscriptionPause } from '@/app/subscriptions/actions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/ToastProvider';
import { isAutoPaused, type PauseReason } from '@/lib/subscriptions/pause';

/**
 * 구독 행 액션: [일시정지/정지해제] [삭제].
 * - 다운그레이드 자동 정지(downgrade)는 수동 해제 불가 → 토글 버튼 숨김(업그레이드 시 자동 복원).
 * - 일시정지/정지해제: 스피너 → 결과 토스트(한도 초과 등 에러 시 상태 유지) → 해당 탭 이동.
 * - 삭제: 확인 모달(삭제/취소). 배경 클릭·ESC 로 닫힘.
 */
export default function SubscriptionRowActions({
  id,
  paused,
  pauseReason,
  title,
  onPausedChange,
}: {
  id: string;
  paused: boolean;
  pauseReason: PauseReason;
  title: string;
  onPausedChange?: (nextPaused: boolean) => void;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmOpen]);

  async function togglePause() {
    if (pending) return;
    const next = !paused;
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('id', id);
      fd.set('paused', String(next));
      const res = await setSubscriptionPause(fd);
      if (!res.ok) {
        showToast(res.error ?? '상태 변경에 실패했습니다');
        return; // 상태 유지(예: 정지해제 한도 초과)
      }
      onPausedChange?.(next); // 해당 상태 탭으로 이동
      showToast(next ? '일시정지되었습니다' : '정지 해제되었습니다');
      router.refresh(); // 최신 목록 반영(항목이 다른 탭으로 이동)
    } catch {
      showToast('상태 변경에 실패했습니다');
    } finally {
      setPending(false);
    }
  }

  const autoPaused = paused && isAutoPaused(pauseReason);

  return (
    <div className="flex shrink-0 items-center gap-2">
      {/* 다운그레이드 자동 정지는 수동 토글 숨김(업그레이드 시 자동 복원) */}
      {!autoPaused && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={togglePause}
          data-testid="toggle-pause-subscription"
          className="min-w-[72px]"
        >
          {pending ? <Spinner size={14} /> : paused ? '정지해제' : '일시정지'}
        </Button>
      )}

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
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
                  className="h-9 rounded-lg bg-danger px-4 text-sm font-medium text-danger-foreground transition-opacity hover:opacity-90"
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
