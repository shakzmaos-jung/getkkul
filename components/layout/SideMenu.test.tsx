import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SideMenu from './SideMenu';

afterEach(cleanup);

describe('SideMenu (우측 슬라이드 패널)', () => {
  it('열림 시 dialog + 메뉴 행(소개·개발자·설정·테마·카피라이트)을 노출한다', () => {
    render(<SideMenu open onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByTestId('menu-about')).toBeTruthy(); // 서비스 소개(아코디언)
    expect(screen.getByTestId('menu-developer')).toBeTruthy(); // 개발자 정보(아코디언)
    expect(screen.getByTestId('menu-settings')).toBeTruthy(); // 설정 진입
    expect(screen.getByTestId('menu-licenses')).toBeTruthy(); // 오픈소스 라이선스
    expect(screen.getByTestId('theme-toggle')).toBeTruthy(); // 테마 토글
    expect(screen.getByText('© 2026 getkkul · Made in Seoul')).toBeTruthy(); // 카피라이트
  });

  it('서비스 소개·개발자 정보는 접혀 있고, 메뉴명을 누르면 펼쳐진다(아코디언)', () => {
    render(<SideMenu open onClose={() => {}} />);
    // 접힘: 내용 텍스트가 아직 없음
    expect(screen.queryByText('구독한 콘텐츠의 핵심만')).toBeNull();
    expect(screen.queryByText('정상화')).toBeNull();

    fireEvent.click(screen.getByTestId('menu-about'));
    expect(screen.getByText('구독한 콘텐츠의 핵심만')).toBeTruthy();
    expect(screen.getByTestId('menu-about').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByTestId('menu-developer'));
    expect(screen.getByText('정상화')).toBeTruthy();
  });

  it('닫힘 상태에서는 dialog 가 접근 트리에 노출되지 않는다(aria-hidden)', () => {
    render(<SideMenu open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('닫기 버튼 · 오버레이 탭 · ESC 로 onClose 를 호출한다', () => {
    const onClose = vi.fn();
    render(<SideMenu open onClose={onClose} />);

    fireEvent.click(screen.getByTestId('menu-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('menu-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
