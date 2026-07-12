'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
 * 각 탭 [아이콘 위 + 라벨 아래], 활성 = 앰버 + 슬라이딩 인디케이터(요약길이 선택 UX 미러).
 * 낙관적 선택: 탭을 누르는 즉시 인디케이터가 이동하고 화면 로드(Link)는 곧바로 시작 —
 * "탭 이동 애니메이션이 끝난 뒤 로드"가 아니라 즉시 피드백 + 즉시 로드로 체감 로딩 최소화.
 */
export default function BottomNav({
  pathname,
  badges = {},
}: {
  pathname: string;
  badges?: Partial<Record<NavKey, number>>;
}) {
  const activeKey = activeTabKey(pathname);
  // 탭을 누른 순간 인디케이터를 먼저 이동(pending). 라우팅 완료(pathname 변경) 시 실제 활성으로 정리.
  const [pendingKey, setPendingKey] = useState<NavKey | null>(null);
  useEffect(() => {
    // 라우팅 완료 시 낙관적 pending 을 실제 활성으로 정리 — 라우트 변경에 동기화하는 의도된 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingKey(null);
  }, [pathname]);
  const shownKey = pendingKey ?? activeKey;
  const shownIndex = shownKey ? NAV_TABS.findIndex((t) => t.key === shownKey) : -1;

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative mx-auto flex h-[72px] max-w-md items-stretch">
        {/* 슬라이딩 선택 인디케이터 — 누르는 즉시 해당 탭으로 이동(CSS transform, 비차단). */}
        {shownIndex >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-2 left-0 w-1/4 rounded-2xl transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${shownIndex * 100}%)`, backgroundColor: `${BRAND}26` }}
          />
        )}
        {NAV_TABS.map((t) => {
          const isActive = t.key === shownKey;
          const count = badges[t.key];
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`nav-${t.key}`}
              onClick={() => setPendingKey(t.key)}
              className="relative z-10 flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1.5"
              style={{ color: isActive ? BRAND : undefined }}
            >
              <span className={isActive ? '' : 'text-muted-foreground'}>
                <Icon tab={t.key} />
              </span>
              <span
                className={`text-[11px] leading-none ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                {t.label}
              </span>
              {/* 뱃지 슬롯(구조만). count 전달 시 노출 — 현재 미사용. */}
              {count != null && count > 0 && (
                <span
                  aria-label={`새 항목 ${count}개`}
                  className="absolute right-[calc(50%-1.5rem)] top-2 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-white"
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
