import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SideMenu from './SideMenu';

afterEach(cleanup);

describe('SideMenu (우측 슬라이드 패널)', () => {
  it('열림 시 dialog + 5개 섹션(소개·개발자·설정·테마·카피라이트)을 노출한다', () => {
    render(<SideMenu open onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('구독한 콘텐츠의 핵심만')).toBeTruthy(); // 서비스 소개
    expect(screen.getByText('정상화')).toBeTruthy(); // 개발자
    expect(screen.getByTestId('menu-settings')).toBeTruthy(); // 설정 진입
    expect(screen.getByTestId('theme-toggle')).toBeTruthy(); // 테마 토글
    expect(screen.getByText('© 2026 getkkul · Made in Seoul')).toBeTruthy(); // 카피라이트
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
