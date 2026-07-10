'use client';

import Link from 'next/link';
import { NAV_TABS, activeTabKey, type NavKey } from '@/lib/nav/tabs';

/** 겟꿀 브랜드 앰버(활성 탭). 앱 accent(파랑)와 별개. 라이트/다크 공통. */
const BRAND = '#F5A623';

function Icon({ tab }: { tab: NavKey }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (tab) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'feed': // 문서(요약 다이제스트)
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5M8 12h8M8 16h6" />
        </svg>
      );
    case 'channels': // TV/방송(구독 채널)
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="m8 8 4-4 4 4" />
        </svg>
      );
    case 'membership': // 크라운(멤버십)
      return (
        <svg {...common}>
          <path d="M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11" />
        </svg>
      );
  }
}

/**
 * 하단 GNB (카카오톡 스타일 플랫·경량). 배경 블러/글라스 없이 테마 단색 + 얇은 상단 hairline.
 * 각 탭 [아이콘 위 + 라벨 아래], 활성 앰버. 세이프에어리어 여백. 뱃지 구조 준비(현재 미노출).
 */
export default function BottomNav({
  pathname,
  badges = {},
}: {
  pathname: string;
  badges?: Partial<Record<NavKey, number>>;
}) {
  const active = activeTabKey(pathname);
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-[72px] max-w-md items-stretch">
        {NAV_TABS.map((t) => {
          const isActive = t.key === active;
          const count = badges[t.key];
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${t.key}`}
              className="relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: isActive ? BRAND : undefined }}
            >
              <span className={isActive ? '' : 'text-muted-foreground'}>
                <Icon tab={t.key} />
              </span>
              <span
                className={`text-[11px] leading-none ${isActive ? 'font-medium' : 'text-muted-foreground'}`}
              >
                {t.label}
              </span>
              {/* 뱃지 슬롯(구조만). count 전달 시 노출 — 현재 미사용. */}
              {count != null && count > 0 && (
                <span
                  aria-label={`새 항목 ${count}개`}
                  className="absolute right-[calc(50%-1.25rem)] top-1.5 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white"
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
