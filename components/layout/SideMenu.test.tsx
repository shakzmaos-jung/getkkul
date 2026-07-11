import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SideMenu from './SideMenu';
import pkg from '../../package.json';

afterEach(cleanup);

describe('SideMenu (재설계 — 프로필·이동 통일·그룹)', () => {
  it('열림 시 dialog + 프로필 카드 + 그룹 항목을 노출한다', () => {
    render(<SideMenu open onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('menu-profile')).toBeTruthy();
    expect(screen.getByTestId('menu-settings')).toBeTruthy();
    expect(screen.getByTestId('menu-about')).toBeTruthy();
    expect(screen.getByTestId('menu-developer')).toBeTruthy();
    expect(screen.getByTestId('menu-licenses')).toBeTruthy();
    expect(screen.getByTestId('theme-toggle')).toBeTruthy(); // 화면 그룹 인라인 토글
    // 로그아웃은 패널에서 제거됨(계정 화면 내부로 이동)
    expect(screen.queryByTestId('menu-logout')).toBeNull();
  });

  it('V1: "메뉴" 4항목이 모두 이동(a[href]) — 아코디언 0개', () => {
    render(<SideMenu open onClose={() => {}} />);
    const items: [string, string][] = [
      ['menu-settings', '/settings'],
      ['menu-about', '/about'],
      ['menu-developer', '/developer'],
      ['menu-licenses', '/licenses'],
    ];
    for (const [testid, href] of items) {
      const el = screen.getByTestId(testid);
      expect(el.tagName).toBe('A'); // 링크(이동)
      expect(el.getAttribute('href')).toBe(href);
      expect(el.getAttribute('aria-expanded')).toBeNull(); // 아코디언 아님
    }
  });

  it('V2: 프로필 카드는 /account 로 이동(폴백 배지 렌더)', () => {
    render(<SideMenu open onClose={() => {}} />);
    const card = screen.getByTestId('menu-profile');
    expect(card.tagName).toBe('A');
    expect(card.getAttribute('href')).toBe('/account');
    expect(card.textContent).toContain('무료'); // 멤버십 미로드 폴백
  });

  it('V3: 푸터 버전이 package.json 기반(하드코딩 아님)', () => {
    render(<SideMenu open onClose={() => {}} />);
    expect(screen.getByTestId('menu-version').textContent).toContain(`v${pkg.version}`);
  });

  it('V6: 닫기 버튼 · 오버레이 탭 · ESC 로 onClose 호출(보존)', () => {
    const onClose = vi.fn();
    render(<SideMenu open onClose={onClose} />);
    fireEvent.click(screen.getByTestId('menu-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('menu-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('닫힘 상태에서는 dialog 가 접근 트리에 노출되지 않는다(aria-hidden)', () => {
    render(<SideMenu open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
