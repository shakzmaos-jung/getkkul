'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'sent'>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

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

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setStep('sent');
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) {
      setError('인증 코드가 올바르지 않거나 만료되었습니다.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="text-3xl">🍯</div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">겟꿀</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">구독한 채널의 핵심만, 정해진 시각에.</p>

        <Button
          variant="primary"
          onClick={signInWithGoogle}
          disabled={loading}
          data-testid="google-signin"
          className="mt-6 w-full"
        >
          Google로 계속하기
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          또는 이메일로
          <span className="h-px flex-1 bg-border" />
        </div>

        {step === 'idle' ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-2 text-left">
            <Input
              type="email"
              required
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
            />
            <Button type="submit" variant="secondary" disabled={loading} className="w-full">
              {loading ? '전송 중…' : '인증 코드 받기'}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-2 text-left">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span>로 보낸 인증 코드를
              입력하세요.
            </p>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              required
              placeholder="인증 코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-testid="login-otp"
              className="tracking-[0.2em]"
            />
            <Button type="submit" variant="primary" disabled={loading} className="w-full">
              {loading ? '확인 중…' : '로그인'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('idle');
                setCode('');
                setError(null);
              }}
              className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
            >
              다른 이메일로
            </button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Card>
    </main>
  );
}
