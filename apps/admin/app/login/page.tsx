'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// 관제 어드민 로그인 — 기존 Supabase Auth(Google OAuth) 재사용(REQ-AU-1). 셀프가입 없음:
// 로그인해도 admin_users 에 없으면 proxy 게이트가 차단한다(AC-AU-2a).
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
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-surface-1 p-8 text-center">
        <div className="text-3xl" aria-hidden>
          🍯
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">
          겟꿀 관제 어드민
        </h1>
        <p className="mt-1.5 text-sm text-ink-subtle">관리자 전용 · Google 로그인</p>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          data-testid="google-signin"
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? '이동 중…' : 'Google로 계속하기'}
        </button>
        {error && <p className="mt-3 text-sm text-crit">{error}</p>}
      </div>
    </main>
  );
}
