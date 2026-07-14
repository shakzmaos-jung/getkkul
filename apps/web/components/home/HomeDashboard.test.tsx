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

const cumulative = {
  digestCount: 128,
  originalText: '80시간',
  compressedText: '6시간',
  savedText: '74시간',
  compressionPct: 92.5,
};

const base = { greetingName: '정상화', badge: '얼리버드 무료 · Medium', value, cumulative };

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
  it('구독 0개면 빈 상태 안내 + 채널 추가, 히어로/대시보드/오늘 감춤', () => {
    render(<HomeDashboard subscriptionCount={0} today={[]} {...base} />);
    expect(screen.getByText(/아직 구독한 채널이 없어요/)).toBeTruthy();
    expect(screen.getByTestId('empty-add-channel')).toBeTruthy();
    expect(screen.queryByTestId('value-hero')).toBeNull();
    expect(screen.queryByTestId('home-stats')).toBeNull();
    expect(screen.queryByTestId('home-today')).toBeNull();
  });

  it('구독이 있으면(정지 포함) 대시보드 표시', () => {
    render(<HomeDashboard subscriptionCount={2} today={[]} {...base} />);
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.queryByText(/아직 구독한 채널이 없어요/)).toBeNull();
  });

  it('가치 히어로(인사말·배지·이번달) + 누적 실적 대시보드 + 오늘의 다이제스트', () => {
    render(<HomeDashboard subscriptionCount={3} today={today} {...base} />);
    const hero = screen.getByTestId('value-hero');
    expect(hero.textContent).toContain('정상화 님');
    expect(hero.textContent).toContain('12개');
    expect(hero.textContent).toContain('4시간 40분'); // 절약

    const t = screen.getByTestId('stat-total');
    expect(t.textContent).toContain('총 누적 다이제스트');
    expect(t.textContent).toContain('128');
    expect(t.textContent).toContain('원본 영상 시간 누계'); // 원본 시간은 총 누적 카드 안으로 이동
    expect(t.textContent).toContain('80');

    const c = screen.getByTestId('stat-compressed');
    expect(c.textContent).toContain('압축 영상 시간 누계');
    expect(c.textContent).toContain('아껴진 시간 74시간');
    expect(c.textContent).toContain('압축률');

    // 제거된 카드
    expect(screen.queryByTestId('stat-month')).toBeNull();
    expect(screen.queryByTestId('stat-channels')).toBeNull();

    expect(screen.getByTestId('home-today')).toBeTruthy();
    expect(screen.getByText('영상 A')).toBeTruthy();
  });

  it('대시보드 셀은 모두 피드로 이동', () => {
    render(<HomeDashboard subscriptionCount={3} today={[]} {...base} />);
    expect(screen.getByTestId('stat-total').getAttribute('href')).toBe('/feed');
    expect(screen.getByTestId('stat-compressed').getAttribute('href')).toBe('/feed');
  });

  it('이번달 실적 0이면 히어로가 안내 문구를 보여준다', () => {
    const empty: ValueSummary = { videoCount: 0, originalText: '0초', readText: '0초', savedText: '0초', compressionPct: null };
    render(<HomeDashboard subscriptionCount={2} today={[]} {...base} value={empty} />);
    expect(screen.getByTestId('value-hero').textContent).toContain('이번달 아직 다이제스트가 없어요');
  });

  it('오늘 카드: 채널·핸들·업데이트·원본·읽는시간·압축률 + 다이제스트 딥링크', () => {
    render(<HomeDashboard subscriptionCount={1} today={today} {...base} />);
    const row = screen.getByTestId('today-item');
    expect(row.textContent).toContain('채널1');
    expect(row.textContent).toContain('@ch1');
    expect(row.textContent).toContain('원본 영상 10분');
    expect(row.textContent).toContain('압축률 90.0%');
    expect(screen.getByTestId('today-open-digest').getAttribute('href')).toBe('/feed?date=2026-07-10#d-1');
  });
});
