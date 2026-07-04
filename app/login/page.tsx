'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 성공 시 브라우저가 Google 로 이동한다.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">겟꿀</h1>
      <p className="text-sm text-gray-500">
        구독한 채널의 핵심만, 정해진 시각에.
      </p>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        data-testid="google-signin"
        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? '이동 중…' : 'Google로 계속하기'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </main>
  );
}
