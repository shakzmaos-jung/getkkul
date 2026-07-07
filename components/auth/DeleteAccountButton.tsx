'use client';

import { useState, useTransition } from 'react';
import { deleteAccount } from '@/app/account/actions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/** 확인 다이얼로그 후 계정 삭제(REQ-A3). auth.users 삭제 → cascade. */
export default function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      await deleteAccount();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="delete-account"
        className="text-danger hover:bg-danger/10 hover:text-danger"
      >
        계정 삭제
      </Button>
      {open && (
        <ConfirmDialog
          title="계정 삭제"
          description="계정과 모든 데이터(구독·설정·발송 이력)가 삭제됩니다. 되돌릴 수 없습니다."
          confirmLabel={pending ? '삭제 중…' : '삭제하기'}
          onConfirm={confirmDelete}
          onClose={() => setOpen(false)}
          danger
          pending={pending}
        />
      )}
    </>
  );
}
