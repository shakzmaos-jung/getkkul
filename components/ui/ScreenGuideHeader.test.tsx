import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ScreenGuideHeader from './ScreenGuideHeader';

afterEach(cleanup);

const props = {
  title: '겟꿀 홈',
  description: '겟꿀은 유튜브 콘텐츠를 꿀같이 압축해줍니다.',
  points: ['첫 번째 안내', '두 번째 안내'],
};

describe('ScreenGuideHeader', () => {
  it('이용 가이드 뱃지를 렌더하고(화면 타이틀은 상단 헤더 담당), 초기엔 다이얼로그를 표시하지 않는다', () => {
    render(<ScreenGuideHeader {...props} />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByTestId('guide-badge')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('첫 번째 안내')).toBeNull();
  });

  it('뱃지를 누르면 설명 + 사용법이 다이얼로그로 열린다', () => {
    render(<ScreenGuideHeader {...props} />);
    fireEvent.click(screen.getByTestId('guide-badge'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/유튜브 콘텐츠를 꿀같이 압축/)).toBeTruthy();
    expect(screen.getByText('첫 번째 안내')).toBeTruthy();
    expect(screen.getByText('두 번째 안내')).toBeTruthy();
  });

  it('닫기 버튼으로 다이얼로그를 닫으면 원화면으로 돌아온다', () => {
    render(<ScreenGuideHeader {...props} />);
    fireEvent.click(screen.getByTestId('guide-badge'));
    fireEvent.click(screen.getByTestId('guide-close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape 키로도 닫힌다', () => {
    render(<ScreenGuideHeader {...props} />);
    fireEvent.click(screen.getByTestId('guide-badge'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
