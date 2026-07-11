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

// 탭이 아닌 화면의 헤더 타이틀(사이드 메뉴 진입 화면 포함).
const ROUTE_TITLE: { prefix: string; title: string }[] = [
  { prefix: '/settings', title: '설정' },
  { prefix: '/referral', title: '친구 초대' },
  { prefix: '/credits', title: '크레딧' },
  { prefix: '/licenses', title: '오픈소스 라이선스' },
  { prefix: '/account', title: '계정' },
  { prefix: '/about', title: '서비스 소개' },
  { prefix: '/developer', title: '개발자 정보' },
];

/** 상단 헤더 좌측 타이틀. 탭이면 탭 라벨, 지정 화면은 각 타이틀, 그 외는 앱명 '겟꿀'. */
export function headerTitle(pathname: string): string {
  const tab = activeTabKey(pathname);
  if (tab) return TAB_TITLE[tab];
  const match = ROUTE_TITLE.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match ? match.title : '겟꿀';
}
