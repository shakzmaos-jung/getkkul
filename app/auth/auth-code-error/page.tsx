import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-bold">로그인에 실패했습니다</h1>
      <p className="text-sm text-gray-500">
        인증 코드를 처리하지 못했습니다. 다시 시도해 주세요.
      </p>
      <Link href="/login" className="text-sm underline">
        로그인으로 돌아가기
      </Link>
    </main>
  );
}
