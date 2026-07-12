'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteAccount } from '@/app/account/actions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const ROW =
  'flex min-h-[48px] w-full items-center gap-2.5 px-4 text-sm font-medium transition-colors';

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

/** 계정 화면의 로그아웃 · 계정삭제 액션(메뉴 행 스타일). 각각 확인 다이얼로그를 거친다. */
export default function AccountActions() {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  async function doLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }
  function doDelete() {
    startDelete(async () => {
      await deleteAccount();
    });
  }

  return (
    <>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          data-testid="signout"
          className={`${ROW} text-foreground hover:bg-muted`}
        >
          <LogoutIcon />
          로그아웃
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          data-testid="delete-account"
          className={`${ROW} text-danger hover:bg-danger/10`}
        >
          <TrashIcon />
          계정 삭제
        </button>
      </div>

      {logoutOpen && (
        <ConfirmDialog
          title="로그아웃"
          description="현재 기기에서 로그아웃합니다. 다시 이용하려면 구글 계정으로 로그인하세요."
          confirmLabel={loggingOut ? '로그아웃 중…' : '로그아웃하기'}
          onConfirm={doLogout}
          onClose={() => setLogoutOpen(false)}
          pending={loggingOut}
        />
      )}
      {deleteOpen && (
        <ConfirmDialog
          title="계정 삭제"
          description="계정과 모든 데이터(구독·설정·발송 이력)가 삭제됩니다. 되돌릴 수 없습니다."
          confirmLabel={deleting ? '삭제 중…' : '삭제하기'}
          onConfirm={doDelete}
          onClose={() => setDeleteOpen(false)}
          danger
          pending={deleting}
        />
      )}
    </>
  );
}
