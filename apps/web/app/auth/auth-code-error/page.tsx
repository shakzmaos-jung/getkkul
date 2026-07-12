import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <h1 className="text-lg font-semibold tracking-tight">로그인에 실패했습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          인증 코드를 처리하지 못했습니다. 다시 시도해 주세요.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          로그인으로 돌아가기
        </Link>
      </Card>
    </main>
  );
}
