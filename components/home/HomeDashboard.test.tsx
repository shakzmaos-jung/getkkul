import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';
import type { ValueSummary } from '@/lib/summary/reading';

afterEach(cleanup);

const value: ValueSummary = {
  videoCount: 12,
  originalText: '5시간',
  readText: '20분',
  savedText: '4시간 40분',
  compressionPct: 93.3,
};

const base = { greetingName: '정상화', badge: '얼리버드 무료 · Medium', value };

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

describe('HomeDashboard', () => {
  it('구독 0개면 빈 상태 안내 + 채널 추가, 히어로/통계 감춤', () => {
    render(<HomeDashboard subscriptionCount={0} totalDigestCount={0} today={[]} {...base} />);
    expect(screen.getByText(/아직 구독한 채널이 없어요/)).toBeTruthy();
    expect(screen.getByTestId('empty-add-channel')).toBeTruthy();
    expect(screen.queryByTestId('value-hero')).toBeNull();
    expect(screen.queryByTestId('home-today')).toBeNull();
  });

  it('구독이 있으면 가치 히어로(인사말·배지·이번달 압축·절약·보조수치) + 오늘의 다이제스트', () => {
    render(<HomeDashboard subscriptionCount={3} totalDigestCount={128} today={today} {...base} />);
    const hero = screen.getByTestId('value-hero');
    expect(hero.textContent).toContain('정상화 님');
    expect(hero.textContent).toContain('얼리버드 무료 · Medium');
    expect(hero.textContent).toContain('12개');
    expect(hero.textContent).toContain('4시간 40분'); // 절약
    expect(screen.getByTestId('hero-total').textContent).toContain('128');
    expect(screen.getByTestId('hero-subs').textContent).toContain('3');
    expect(screen.getByTestId('home-today')).toBeTruthy();
    expect(screen.getByText('영상 A')).toBeTruthy();
  });

  it('보조 수치는 각각 링크로 이동(누적→피드, 구독→구독관리)', () => {
    render(<HomeDashboard subscriptionCount={3} totalDigestCount={0} today={[]} {...base} />);
    expect(screen.getByTestId('hero-total').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('hero-subs').getAttribute('href')).toBe('/subscriptions');
  });

  it('이번달 실적 0이면 히어로가 안내 문구를 보여준다', () => {
    const empty: ValueSummary = { videoCount: 0, originalText: '0초', readText: '0초', savedText: '0초', compressionPct: null };
    render(<HomeDashboard subscriptionCount={2} totalDigestCount={0} today={[]} {...base} value={empty} />);
    expect(screen.getByTestId('value-hero').textContent).toContain('이번달 아직 다이제스트가 없어요');
  });

  it('오늘 카드: 채널·핸들·업데이트·원본·읽는시간·압축률 + 다이제스트 딥링크', () => {
    render(<HomeDashboard subscriptionCount={1} totalDigestCount={1} today={today} {...base} />);
    const row = screen.getByTestId('today-item');
    expect(row.textContent).toContain('채널1');
    expect(row.textContent).toContain('@ch1');
    expect(row.textContent).toContain('원본 영상 10분');
    expect(row.textContent).toContain('압축률 90.0%');
    expect(screen.getByTestId('today-open-digest').getAttribute('href')).toBe('/feed?date=2026-07-10#d-1');
  });
});
