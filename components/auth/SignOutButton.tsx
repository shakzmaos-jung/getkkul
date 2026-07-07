'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function SignOutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="signout"
      >
        로그아웃
      </Button>
      {open && (
        <ConfirmDialog
          title="로그아웃"
          description="현재 기기에서 로그아웃합니다. 다시 이용하려면 구글 계정으로 로그인하세요."
          confirmLabel={pending ? '로그아웃 중…' : '로그아웃하기'}
          onConfirm={signOut}
          onClose={() => setOpen(false)}
          pending={pending}
        />
      )}
    </>
  );
}
