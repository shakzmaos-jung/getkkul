import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

afterEach(cleanup);

const today = [
  {
    id: '1',
    title: '영상 A',
    url: 'https://youtu.be/x',
    channelTitle: '채널1',
    channelThumbnail: null,
    channelHandle: '@ch1',
    dateKst: '2026-07-10',
    updatedText: '2026-07-10 09:30',
    durationText: '10분',
    readText: '1분',
    compressionPct: 90.0,
  },
];

describe('HomeDashboard 빈 상태 분기', () => {
  it('구독 0개면 빈 상태 안내 + 채널 추가 버튼을 보여주고, 통계는 감춘다', () => {
    render(<HomeDashboard subscriptionCount={0} totalDigestCount={0} today={[]} />);
    expect(screen.getByText(/아직 구독한 채널이 없어요/)).toBeTruthy();
    expect(screen.getByTestId('empty-add-channel')).toBeTruthy();
    expect(screen.queryByTestId('home-stats')).toBeNull();
    expect(screen.queryByTestId('home-today')).toBeNull();
  });

  it('구독이 있으면 오늘의 다이제스트 목록 + 누적·구독 통계를 보여준다', () => {
    render(<HomeDashboard subscriptionCount={3} totalDigestCount={128} today={today} />);
    expect(screen.getByTestId('home-today')).toBeTruthy();
    expect(screen.getByText('영상 A')).toBeTruthy();
    // 제목에 오늘 개수 노출
    expect(screen.getByText(/오늘의 다이제스트 \(1\)/)).toBeTruthy();
    expect(screen.getByTestId('stat-total').textContent).toContain('128');
    expect(screen.getByTestId('stat-total').textContent).toContain('누적 다이제스트');
    expect(screen.getByTestId('stat-subscriptions').textContent).toContain('3');
    expect(screen.queryByText(/아직 구독한 채널이 없어요/)).toBeNull();
  });

  it('카드처럼 채널·핸들·업데이트·원본영상·읽는시간·압축률을 함께 표시한다', () => {
    render(<HomeDashboard subscriptionCount={1} totalDigestCount={1} today={today} />);
    const row = screen.getByTestId('today-item');
    expect(row.textContent).toContain('채널1');
    expect(row.textContent).toContain('@ch1');
    expect(row.textContent).toContain('업데이트 2026-07-10 09:30');
    expect(row.textContent).toContain('원본 영상 10분');
    expect(row.textContent).toContain('읽는 시간 1분');
    expect(row.textContent).toContain('압축률 90.0%');
    // 원본 영상 링크는 유튜브 원본 url
    expect(screen.getByTestId('today-original').getAttribute('href')).toBe('https://youtu.be/x');
  });

  it('오늘 다이제스트가 없으면 빈 안내를 보여준다(개수 제한 없음, 오늘 기준)', () => {
    render(<HomeDashboard subscriptionCount={2} totalDigestCount={10} today={[]} />);
    expect(screen.getByTestId('home-today')).toBeTruthy();
    expect(screen.getByText(/오늘은 아직 다이제스트가 없어요/)).toBeTruthy();
  });

  it('통계 카드는 각각 링크로 이동한다(누적→피드, 구독→구독관리)', () => {
    render(<HomeDashboard subscriptionCount={3} totalDigestCount={0} today={[]} />);
    expect(screen.getByTestId('stat-total').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-subscriptions').getAttribute('href')).toBe('/subscriptions');
  });

  it('제목을 누르면 앱 내 다이제스트(/feed)로 이동한다(유튜브 아님)', () => {
    render(<HomeDashboard subscriptionCount={1} totalDigestCount={1} today={today} />);
    const titleLink = screen.getByText('영상 A').closest('a');
    const href = titleLink?.getAttribute('href') ?? '';
    expect(href.startsWith('/feed')).toBe(true);
    expect(href).toContain('2026-07-10');
  });
});
