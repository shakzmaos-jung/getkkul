'use client';

import { usePathname } from 'next/navigation';
import { isPublicPath } from '@/lib/supabase/route-access';
import BottomNav from '@/components/layout/BottomNav';

/**
 * 앱 크롬: 하단 GNB 를 전역 배치하고, 그 높이만큼 콘텐츠 하단 여백을 확보한다.
 * 공개/인증 경로(/login·/auth·/r 등)에서는 숨긴다.
 */
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !isPublicPath(pathname);
  return (
    <div
      className={`flex min-h-full flex-1 flex-col ${
        showNav ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''
      }`}
    >
      {children}
      {showNav && <BottomNav pathname={pathname} />}
    </div>
  );
}
