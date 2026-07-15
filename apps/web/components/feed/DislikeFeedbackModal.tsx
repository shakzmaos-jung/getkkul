'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { messages } from '@/lib/i18n';

const DL = messages.feed.dislike;
export const MAX_DISLIKE_REASON_LEN = 200;

/**
 * 싫어요(👎) 사유 입력 모달 — 화면 중앙. 무엇이 아쉬웠는지 남길 수 있게 한다(품질 개선 신호).
 * - 텍스트 없이도 [보내기] 가능(사유는 선택). [닫기] 는 취소(싫어요 미기록).
 * - N/200 카운터는 textarea 우하단(ContentQA 패턴). ESC·백드롭 클릭으로 닫힘.
 * 입력값은 닫힘/전송 시(이벤트 핸들러) 비워 재오픈 시 항상 빈 상태로 시작한다.
 */
export default function DislikeFeedbackModal({
  open,
  onSubmit,
  onClose,
}: {
  open: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');

  const close = () => {
    setReason('');
    onClose();
  };
  const submit = () => {
    onSubmit(reason.trim());
    setReason('');
  };

  // ESC 로 닫기(취소). setReason 은 이벤트 콜백에서 호출(effect 본문 아님).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReason('');
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={DL.title}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-semibold">{DL.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{DL.subtitle}</p>
        </div>

        <div className="relative">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, MAX_DISLIKE_REASON_LEN))}
            maxLength={MAX_DISLIKE_REASON_LEN}
            rows={4}
            autoFocus
            placeholder={DL.placeholder}
            data-testid="dislike-reason-input"
            /* 폰트 16px 이상: iOS 포커스 시 자동 확대(줌인) 방지 */
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 pb-7 text-base outline-none focus:border-foreground/40"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-muted-foreground">
            {reason.length}/{MAX_DISLIKE_REASON_LEN}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} data-testid="dislike-close">
            {DL.close}
          </Button>
          <Button type="button" variant="primary" onClick={submit} data-testid="dislike-submit">
            {DL.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}
