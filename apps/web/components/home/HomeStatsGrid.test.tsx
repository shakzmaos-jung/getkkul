import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeStatsGrid from './HomeStatsGrid';

afterEach(cleanup);

const props = {
  total: { count: 1234, originalText: '820시간 3분', readText: '61시간' },
  month: { count: 42, originalText: '20시간', readText: '2시간' },
  channels: { active: 20, paused: 2 },
};

describe('HomeStatsGrid (홈 실적 대시보드 1×3)', () => {
  it('세 셀의 강조 숫자 + 약한 보조 수치를 렌더한다', () => {
    render(<HomeStatsGrid {...props} />);
    const t = screen.getByTestId('stat-total');
    expect(t.textContent).toContain('총 누적 다이제스트');
    expect(t.textContent).toContain('1,234'); // 천단위 구분
    expect(t.textContent).toContain('원본 영상 820시간 3분');
    expect(t.textContent).toContain('읽는 시간 61시간');

    const m = screen.getByTestId('stat-month');
    expect(m.textContent).toContain('이번달 다이제스트');
    expect(m.textContent).toContain('42');
    expect(m.textContent).toContain('원본 영상 20시간');

    const c = screen.getByTestId('stat-channels');
    expect(c.textContent).toContain('구독 중인 채널');
    expect(c.textContent).toContain('20');
    expect(c.textContent).toContain('일시정지 2개');
  });

  it('셀 링크: 총 누적·이번달 → /feed, 채널 → /subscriptions', () => {
    render(<HomeStatsGrid {...props} />);
    expect(screen.getByTestId('stat-total').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-month').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-channels').getAttribute('href')).toBe('/subscriptions');
  });

  it('강조 실적 숫자는 bold 를 쓰지 않는다(크기·색으로만 위계 — 요청)', () => {
    render(<HomeStatsGrid {...props} />);
    const big = screen.getByText('1,234');
    expect(big.className).not.toMatch(/font-(bold|semibold)/);
  });
});
