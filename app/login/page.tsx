'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="text-3xl">🍯</div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">겟꿀</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          구독한 채널의 핵심만, 정해진 시각에.
        </p>
        <Button
          variant="primary"
          onClick={signInWithGoogle}
          disabled={loading}
          data-testid="google-signin"
          className="mt-6 w-full"
        >
          {loading ? '이동 중…' : 'Google로 계속하기'}
        </Button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
    </main>
  );
}
