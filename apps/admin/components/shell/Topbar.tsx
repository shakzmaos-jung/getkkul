'use client';

import { usePathname } from 'next/navigation';
import { MODULES } from '@/lib/modules';

export function Topbar() {
  const pathname = usePathname();
  const current = MODULES.find(
    (m) => pathname === m.path || pathname.startsWith(`${m.path}/`),
  );
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-surface-1 px-6">
      <h1 className="text-sm font-medium text-ink">
        {current?.label ?? '관제'}
      </h1>
      <span className="rounded-pill bg-surface-2 px-2.5 py-1 text-xs text-ink-subtle">
        M1 셸
      </span>
    </header>
  );
}
