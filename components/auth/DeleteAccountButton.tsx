'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/account/actions';
import { Button } from '@/components/ui/Button';

/** 2단계 확인 후 계정 삭제(REQ-A3). 네이티브 confirm 대신 인라인 확인 UI 사용. */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        data-testid="delete-account"
        className="text-danger hover:bg-danger/10 hover:text-danger"
      >
        계정 삭제
      </Button>
    );
  }

  return (
    <form
      action={deleteAccount}
      className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4"
    >
      <p className="text-sm text-danger">
        계정과 모든 데이터(구독·설정·발송이력)가 삭제됩니다. 되돌릴 수 없습니다.
      </p>
      <div className="flex gap-2">
        <Button
          type="submit"
          variant="danger"
          size="sm"
          data-testid="delete-account-confirm"
          className="border-danger bg-danger text-white hover:bg-danger hover:opacity-90"
        >
          삭제 확정
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(false)}>
          취소
        </Button>
      </div>
    </form>
  );
}
