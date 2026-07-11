/**
 * 하단 GNB 탭 정의 + 현재 경로 → 활성 탭 판정 (순수 — TDD 원천).
 * 순서 고정: 홈 · 다이제스트 · 채널 · 멤버십.
 */
export type NavKey = 'home' | 'feed' | 'channels' | 'membership';

export interface NavTab {
  key: NavKey;
  label: string;
  href: string;
}

export const NAV_TABS: NavTab[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'feed', label: '다이제스트', href: '/feed' },
  { key: 'channels', label: '채널', href: '/subscriptions' },
  { key: 'membership', label: '멤버십', href: '/membership' },
];

/** 현재 경로(usePathname, 쿼리 제외)로 활성 탭 판정. 매칭 없으면 null(예: /settings). */
export function activeTabKey(pathname: string): NavKey | null {
  if (pathname === '/') return 'home';
  if (pathname === '/feed' || pathname.startsWith('/feed/')) return 'feed';
  if (pathname === '/subscriptions' || pathname.startsWith('/subscriptions/')) return 'channels';
  if (pathname === '/membership' || pathname.startsWith('/membership/')) return 'membership';
  return null;
}

const TAB_TITLE: Record<NavKey, string> = {
  home: '홈',
  feed: '다이제스트',
  channels: '채널',
  membership: '멤버십',
};

/** 상단 헤더 좌측 타이틀. 탭이면 탭 라벨, 설정은 '설정', 그 외는 앱명 '겟꿀'. */
export function headerTitle(pathname: string): string {
  const tab = activeTabKey(pathname);
  if (tab) return TAB_TITLE[tab];
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return '설정';
  if (pathname === '/licenses' || pathname.startsWith('/licenses/')) return '오픈소스 라이선스';
  return '겟꿀';
}
