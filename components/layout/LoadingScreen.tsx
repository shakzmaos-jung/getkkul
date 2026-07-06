import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import GetkkulLoader from '@/components/layout/GetkkulLoader';

/** 페이지 이동 시 route loading 경계에서 쓰는 공용 로딩 화면. 셸(헤더/푸터) 유지 + 겟꿀 로더 중앙. */
export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-24 sm:px-6">
        <GetkkulLoader />
      </main>
      <AppFooter />
    </div>
  );
}
