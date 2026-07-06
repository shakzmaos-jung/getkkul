import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { Skeleton } from '@/components/ui/Skeleton';

/** 설정 로딩 스켈레톤 — 제목·카드 2개 자리. */
export default function SettingsLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <Skeleton className="h-8 w-20" />
        </header>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
