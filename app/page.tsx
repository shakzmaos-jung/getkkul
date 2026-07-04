import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/auth/SignOutButton';
import DeleteAccountButton from '@/components/auth/DeleteAccountButton';

/**
 * 보호된 홈. proxy 가 1차로 가드하지만, 서버 액션/직접 접근을 대비해
 * 서버 컴포넌트에서도 인증을 재확인한다 (Next.js 16 proxy 가이드 권장).
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">겟꿀</h1>
      <p className="text-sm text-gray-500" data-testid="user-email">
        {user.email}
      </p>
      <SignOutButton />
      <DeleteAccountButton />
    </main>
  );
}
