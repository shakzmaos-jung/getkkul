import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

afterEach(cleanup);

const recent = [
  { id: '1', title: '영상 A', channelTitle: '채널1', time: '7/5 09:30', url: 'https://youtu.be/1' },
];

describe('HomeDashboard 빈 상태 분기', () => {
  it('구독 0개면 빈 상태 안내 + 채널 추가 버튼을 보여주고, 통계는 감춘다', () => {
    render(
      <HomeDashboard subscriptionCount={0} todayDigestCount={0} nextSlot="11:30" recent={[]} />,
    );
    expect(screen.getByText(/아직 구독한 채널이 없어요/)).toBeTruthy();
    expect(screen.getByTestId('empty-add-channel')).toBeTruthy();
    expect(screen.queryByTestId('home-stats')).toBeNull();
  });

  it('구독이 있으면 통계 3종 + 채널 관리 버튼 + 최근 미리보기를 보여준다', () => {
    render(
      <HomeDashboard
        subscriptionCount={3}
        todayDigestCount={2}
        nextSlot="11:30"
        recent={recent}
      />,
    );
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.getByTestId('stat-subscriptions').textContent).toContain('3');
    expect(screen.getByTestId('stat-today').textContent).toContain('2');
    expect(screen.getByTestId('stat-next-slot').textContent).toContain('11:30');
    expect(screen.getByTestId('manage-channels')).toBeTruthy();
    expect(screen.queryByText(/아직 구독한 채널이 없어요/)).toBeNull();
    expect(screen.getByText('영상 A')).toBeTruthy();
  });
});
