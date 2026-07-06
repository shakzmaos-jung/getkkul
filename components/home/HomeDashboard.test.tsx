import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

afterEach(cleanup);

const recent = [
  { id: '1', title: '영상 A', channelTitle: '채널1', time: '07-05 09:30', dateKst: '2026-07-05' },
];

describe('HomeDashboard 빈 상태 분기', () => {
  it('구독 0개면 빈 상태 안내 + 채널 추가 버튼을 보여주고, 통계는 감춘다', () => {
    render(
      <HomeDashboard subscriptionCount={0} todayDigestCount={0} totalDigestCount={0} recent={[]} />,
    );
    expect(screen.getByText(/아직 구독한 채널이 없어요/)).toBeTruthy();
    expect(screen.getByTestId('empty-add-channel')).toBeTruthy();
    expect(screen.queryByTestId('home-stats')).toBeNull();
  });

  it('구독이 있으면 통계 3종 + 최근 미리보기를 보여준다', () => {
    render(
      <HomeDashboard
        subscriptionCount={3}
        todayDigestCount={2}
        totalDigestCount={128}
        recent={recent}
      />,
    );
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.getByTestId('stat-subscriptions').textContent).toContain('3');
    expect(screen.getByTestId('stat-today').textContent).toContain('2');
    expect(screen.getByTestId('stat-total').textContent).toContain('128');
    expect(screen.getByTestId('stat-total').textContent).toContain('누적 다이제스트');
    expect(screen.queryByText(/아직 구독한 채널이 없어요/)).toBeNull();
    expect(screen.getByText('영상 A')).toBeTruthy();
  });

  it('구독 채널/오늘·누적 다이제스트 통계는 각각 링크로 이동한다', () => {
    render(
      <HomeDashboard subscriptionCount={3} todayDigestCount={0} totalDigestCount={0} recent={[]} />,
    );
    expect(screen.getByTestId('stat-subscriptions').getAttribute('href')).toBe('/subscriptions');
    expect(screen.getByTestId('stat-today').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-total').getAttribute('href')).toBe('/feed');
  });

  it('최근 항목은 앱 내 다이제스트(/feed)로 이동한다(유튜브 아님)', () => {
    render(
      <HomeDashboard subscriptionCount={1} todayDigestCount={1} totalDigestCount={1} recent={recent} />,
    );
    const href = screen.getByTestId('recent-item').getAttribute('href') ?? '';
    expect(href.startsWith('/feed')).toBe(true);
    expect(href).toContain('2026-07-05');
  });
});
