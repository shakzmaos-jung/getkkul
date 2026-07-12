'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/lib/modules';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-hairline bg-surface-1 p-3">
      <div className="flex items-center gap-2 px-2 py-3">
        <span className="text-lg" aria-hidden>
          🍯
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink">
          겟꿀 관제
        </span>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="관제 모듈">
        {MODULES.map((m) => {
          const active =
            pathname === m.path || pathname.startsWith(`${m.path}/`);
          return (
            <Link
              key={m.id}
              href={m.path}
              aria-current={active ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-surface-3 text-ink'
                  : 'text-ink-subtle hover:bg-surface-2 hover:text-ink-muted'
              }`}
            >
              {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
