import { describe, it, expect } from 'vitest';
import { NAV_TABS, activeTabKey, headerTitle } from './tabs';

describe('NAV_TABS 순서·라우트', () => {
  it('홈·다이제스트·채널·멤버십 순서 + href 매핑', () => {
    expect(NAV_TABS.map((t) => t.key)).toEqual(['home', 'feed', 'channels', 'membership']);
    expect(NAV_TABS.map((t) => t.href)).toEqual(['/', '/feed', '/subscriptions', '/membership']);
    expect(NAV_TABS.map((t) => t.label)).toEqual(['홈', '다이제스트', '채널', '멤버십']);
  });
});

describe('activeTabKey (현재 경로 → 활성 탭)', () => {
  it('정확 매칭', () => {
    expect(activeTabKey('/')).toBe('home');
    expect(activeTabKey('/feed')).toBe('feed');
    expect(activeTabKey('/subscriptions')).toBe('channels');
    expect(activeTabKey('/membership')).toBe('membership');
  });
  it('하위 경로도 해당 탭 유지', () => {
    expect(activeTabKey('/feed/anything')).toBe('feed');
    expect(activeTabKey('/subscriptions/x')).toBe('channels');
    expect(activeTabKey('/membership/x')).toBe('membership');
  });
  it('매칭 없는 경로는 null (설정·추천 등)', () => {
    expect(activeTabKey('/settings')).toBeNull();
    expect(activeTabKey('/referral')).toBeNull();
    expect(activeTabKey('/login')).toBeNull();
  });
  it('홈은 정확히 "/"만 (다른 경로가 / 로 시작해도 홈 아님)', () => {
    expect(activeTabKey('/feed')).not.toBe('home');
    expect(activeTabKey('/membership')).not.toBe('home');
  });
});

describe('headerTitle (현재 경로 → 상단 헤더 타이틀)', () => {
  it('탭 경로는 탭 라벨', () => {
    expect(headerTitle('/')).toBe('홈');
    expect(headerTitle('/feed')).toBe('다이제스트');
    expect(headerTitle('/subscriptions')).toBe('채널');
    expect(headerTitle('/membership')).toBe('멤버십');
  });
  it('하위 경로도 탭 라벨 유지', () => {
    expect(headerTitle('/feed/x')).toBe('다이제스트');
    expect(headerTitle('/subscriptions/abc')).toBe('채널');
  });
  it('설정은 "설정"', () => {
    expect(headerTitle('/settings')).toBe('설정');
  });
  it('그 외 경로는 앱명 "겟꿀"', () => {
    expect(headerTitle('/referral')).toBe('겟꿀');
    expect(headerTitle('/anything')).toBe('겟꿀');
  });
});
