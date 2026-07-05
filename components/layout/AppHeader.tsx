import Link from 'next/link';
import type { ReactNode } from 'react';
import ThemeToggle from '@/components/layout/ThemeToggle';

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

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
        <Link href="/feed" className="text-base font-semibold tracking-tight">
          🍯 겟꿀
        </Link>
        <nav className="flex items-center gap-0.5">
          <NavLink href="/feed">다이제스트</NavLink>
          <NavLink href="/subscriptions">구독</NavLink>
          <NavLink href="/settings">설정</NavLink>
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
