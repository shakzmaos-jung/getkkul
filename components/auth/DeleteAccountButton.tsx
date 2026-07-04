'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/account/actions';

/** 2단계 확인 후 계정 삭제(REQ-A3). 네이티브 confirm 대신 인라인 확인 UI 사용. */
export default function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        data-testid="delete-account"
        className="text-xs text-red-500 underline"
      >
        계정 삭제
      </button>
    );
  }

  return (
    <form action={deleteAccount} className="flex flex-col items-center gap-2">
      <p className="text-xs text-red-500">
        계정과 모든 데이터(구독·설정·발송이력)가 삭제됩니다. 되돌릴 수 없습니다.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="delete-account-confirm"
          className="rounded-md bg-red-500 px-3 py-1.5 text-xs text-white hover:bg-red-600"
        >
          삭제 확정
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
