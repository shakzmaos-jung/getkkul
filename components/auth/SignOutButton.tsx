'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      data-testid="signout"
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      로그아웃
    </button>
  );
}
