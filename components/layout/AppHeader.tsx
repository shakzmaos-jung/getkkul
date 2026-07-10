import Link from 'next/link';
import type { ReactNode } from 'react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import InstallButton from '@/components/pwa/InstallButton';
// ShareButton(링크 공유 아이콘) 현재 숨김 — 필요 시 아래 nav 에서 다시 노출.

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

/** 설정 진입 아이콘(톱니). 다른 아이콘 액션과 동일한 크기/스타일. */
function SettingsIconLink() {
  return (
    <Link
      href="/settings"
      aria-label="설정"
      title="설정"
      data-testid="nav-settings"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          🍯 겟꿀
        </Link>
        {/* 순서: 다이제스트 › 채널 › 설정(아이콘) › 라이트/다크 토글. 설치버튼은 조건부라 아이콘군 앞에.
            공유(ShareButton)는 현재 숨김 — 복구하려면 <ThemeToggle /> 뒤에 <ShareButton /> 추가. */}
        <nav className="flex items-center gap-1.5">
          <NavLink href="/feed">다이제스트</NavLink>
          <NavLink href="/subscriptions">채널</NavLink>
          <NavLink href="/membership">멤버십</NavLink>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <InstallButton />
          <SettingsIconLink />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
