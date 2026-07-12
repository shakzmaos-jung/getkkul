import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { Sidebar, SIDEBAR_COOKIE } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { getAdminProfile } from '@/lib/auth/profile';

// 관제 셸 — 인증 게이트(proxy) 통과한 어드민 모듈을 감싼다. /login·/auth 는 이 그룹 밖.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [profile, cookieStore] = await Promise.all([getAdminProfile(), cookies()]);
  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === '1';

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar profile={profile} initialCollapsed={initialCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
