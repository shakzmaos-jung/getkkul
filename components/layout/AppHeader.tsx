'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import InstallButton from '@/components/pwa/InstallButton';
import SideMenu from '@/components/layout/SideMenu';
import { headerTitle } from '@/lib/nav/tabs';

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

/**
 * 상단 헤더(심플·플랫, 바텀 GNB 와 같은 톤). 좌: 현재 화면 타이틀 · 우: 설치 + 햄버거.
 * 브랜드/설정/테마 등 유틸리티는 햄버거로 여는 우측 SideMenu 로 이관.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    // 닫으면 포커스를 햄버거로 복귀(접근성).
    hamburgerRef.current?.focus();
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-base font-semibold tracking-tight">{headerTitle(pathname)}</h1>
          <div className="flex items-center gap-1.5">
            <InstallButton />
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="메뉴 열기"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              data-testid="menu-open"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>
      </header>
      <SideMenu open={menuOpen} onClose={closeMenu} />
    </>
  );
}
