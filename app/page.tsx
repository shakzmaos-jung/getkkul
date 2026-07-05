import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';

/**
 * 홈. proxy 가 1차로 가드하지만, 서버 액션/직접 접근을 대비해
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
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">안녕하세요 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="user-email">
            {user.email}
          </p>
        </header>

        <Card className="flex flex-col gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            구독한 채널의 새 영상 요약을 확인하세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/feed"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              다이제스트 보기
            </Link>
            <Link
              href="/subscriptions"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              채널 구독 관리
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
