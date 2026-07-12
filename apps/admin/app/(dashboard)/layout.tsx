import type { ReactNode } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';

// 관제 셸 — 인증 게이트(proxy) 통과한 어드민 모듈을 감싼다. /login·/auth 는 이 그룹 밖.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
