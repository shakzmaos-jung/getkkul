import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeStatsGrid from './HomeStatsGrid';

afterEach(cleanup);

const props = {
  digestCount: 1234,
  originalText: '820시간 3분',
  compressedText: '61시간',
  savedText: '759시간',
  compressionPct: 92.6,
};

describe('HomeStatsGrid (홈 누적 실적 대시보드 1×3)', () => {
  it('세 셀: 총 누적 다이제스트 · 원본 시간 누계 · 압축 시간 누계(+아껴진 시간·압축률)', () => {
    render(<HomeStatsGrid {...props} />);
    const t = screen.getByTestId('stat-total');
    expect(t.textContent).toContain('총 누적 다이제스트');
    expect(t.textContent).toContain('1,234'); // 천단위 구분

    const o = screen.getByTestId('stat-original');
    expect(o.textContent).toContain('원본 영상 시간 누계');
    expect(o.textContent).toContain('820');
    expect(o.textContent).toContain('시간');

    const c = screen.getByTestId('stat-compressed');
    expect(c.textContent).toContain('압축 영상 시간 누계');
    expect(c.textContent).toContain('61');
    expect(c.textContent).toContain('아껴진 시간 759시간');
    expect(c.textContent).toContain('압축률 93%'); // 92.6 → 93 (toFixed(0))
  });

  it('이번달·구독 채널 카드는 제거됨', () => {
    render(<HomeStatsGrid {...props} />);
    expect(screen.queryByTestId('stat-month')).toBeNull();
    expect(screen.queryByTestId('stat-channels')).toBeNull();
  });

  it('압축률 데이터 없으면(null) 압축률 줄 미표시(아껴진 시간은 표시)', () => {
    render(<HomeStatsGrid {...props} compressionPct={null} />);
    const c = screen.getByTestId('stat-compressed');
    expect(c.textContent).not.toContain('압축률');
    expect(c.textContent).toContain('아껴진 시간');
  });

  it('셀 링크는 모두 /feed', () => {
    render(<HomeStatsGrid {...props} />);
    expect(screen.getByTestId('stat-total').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-original').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-compressed').getAttribute('href')).toBe('/feed');
  });

  it('강조 실적 숫자는 bold 미사용(크기·색으로만 위계 — 요청)', () => {
    render(<HomeStatsGrid {...props} />);
    const big = screen.getByText('1,234');
    expect(big.className).not.toMatch(/font-(bold|semibold)/);
  });
});
