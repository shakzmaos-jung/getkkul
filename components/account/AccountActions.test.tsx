import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AccountActions from './AccountActions';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/app/account/actions', () => ({ deleteAccount: vi.fn() }));

afterEach(cleanup);

describe('AccountActions (계정 화면 로그아웃·삭제)', () => {
  it('로그아웃·계정삭제 행을 렌더한다', () => {
    render(<AccountActions />);
    expect(screen.getByTestId('signout')).toBeTruthy();
    expect(screen.getByTestId('delete-account')).toBeTruthy();
  });

  it('V4: 로그아웃 클릭 시 확인 다이얼로그(세션 종료 진입)', () => {
    render(<AccountActions />);
    expect(screen.queryByText('로그아웃하기')).toBeNull();
    fireEvent.click(screen.getByTestId('signout'));
    expect(screen.getByText('로그아웃하기')).toBeTruthy();
  });

  it('계정삭제 클릭 시 확인 다이얼로그', () => {
    render(<AccountActions />);
    fireEvent.click(screen.getByTestId('delete-account'));
    expect(screen.getByText('삭제하기')).toBeTruthy();
  });
});
