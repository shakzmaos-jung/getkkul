'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MODULES } from '@/lib/modules';
import type { AdminProfile } from '@/lib/auth/profile';

const ROLE_LABEL: Record<string, string> = {
  master: '마스터',
  sub_master: '서브마스터',
};

export const SIDEBAR_COOKIE = 'gk-admin-sidebar';

export function Sidebar({
  profile,
  initialCollapsed,
}: {
  profile: AdminProfile;
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  // 초기값은 서버가 쿠키에서 읽어 전달(SSR 일치·FOUC 방지). 이후 토글은 쿠키에 기록해 유지.
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-hairline bg-surface-1 transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* 브랜드 + 접기/열기 토글 */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="text-lg" aria-hidden>
          🍯
        </span>
        {!collapsed && (
          <span className="flex-1 truncate text-sm font-semibold tracking-tight text-ink">
            겟꿀 관제
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? '사이드바 열기' : '사이드바 접기'}
          title={collapsed ? '사이드바 열기' : '사이드바 접기'}
          className="rounded-md px-1.5 py-1 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* 모듈 네비 */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="관제 모듈">
        {MODULES.map((m) => {
          const active = pathname === m.path || pathname.startsWith(`${m.path}/`);
          return (
            <Link
              key={m.id}
              href={m.path}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? m.label : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                active
                  ? 'bg-surface-3 text-ink'
                  : 'text-ink-subtle hover:bg-surface-2 hover:text-ink-muted'
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {m.icon}
              </span>
              {!collapsed && <span className="truncate">{m.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 로그인 프로필 */}
      <div className="border-t border-hairline p-2">
        <div
          className={`flex items-center gap-2.5 rounded-md px-2 py-2 ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? (profile.email ?? '') : undefined}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {(profile.email?.[0] ?? '?').toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-ink">
                {profile.email ?? '알 수 없음'}
              </div>
              <div className="text-[11px] text-ink-tertiary">
                {profile.role ? (ROLE_LABEL[profile.role] ?? profile.role) : '—'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
