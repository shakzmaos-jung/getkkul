import { describe, it, expect } from 'vitest';
import {
  mapDigestRow,
  preloadFromKstDate,
  isPreloadedDate,
  type FeedDigestRow,
  type ChannelMeta,
} from './map-digests';

const kst = (iso: string) => iso.slice(0, 10);
const channels = new Map<string, ChannelMeta>([
  ['c1', { title: '채널1', thumbnail: 't1', handle: '@c1' }],
]);

const row = (over: Partial<FeedDigestRow> = {}): FeedDigestRow => ({
  id: 'v1',
  channel_id: 'c1',
  title: '영상',
  url: 'https://youtu.be/x',
  published_at: '2026-07-10T01:00:00Z',
  duration_seconds: 300,
  summaries: {
    normal: { coreText: '핵심', bullets: ['a', 'b'] },
    short: { coreText: '짧게', bullets: [] },
  },
  pref_mode: null,
  bookmarked: false,
  ...over,
});

describe('mapDigestRow', () => {
  it('RPC 행을 카드로 매핑한다(채널 메타·KST 일자·요약 파싱)', () => {
    const m = mapDigestRow(row(), channels, 'normal', kst)!;
    expect(m.channelTitle).toBe('채널1');
    expect(m.channelHandle).toBe('@c1');
    expect(m.dateKst).toBe('2026-07-10');
    expect(m.summaries.normal?.coreText).toBe('핵심');
    expect(m.summaries.normal?.bullets).toEqual(['a', 'b']);
    expect(m.initialMode).toBe('normal'); // 글로벌 모드 존재 → 사용
    expect(m.bookmarked).toBe(false);
  });

  it('영상별 선택(pref_mode)이 있으면 우선한다', () => {
    const m = mapDigestRow(row({ pref_mode: 'short' }), channels, 'normal', kst)!;
    expect(m.initialMode).toBe('short');
  });

  it('글로벌 모드 요약이 없으면 존재하는 첫 모드로 폴백', () => {
    const m = mapDigestRow(
      row({ summaries: { long: { coreText: 'L', bullets: [] } } }),
      channels,
      'normal',
      kst,
    )!;
    expect(m.initialMode).toBe('long');
  });

  it('요약이 비면 null(카드 성립 안 함)', () => {
    expect(mapDigestRow(row({ summaries: {} }), channels, 'normal', kst)).toBeNull();
    expect(mapDigestRow(row({ summaries: null }), channels, 'normal', kst)).toBeNull();
  });
});

describe('하이브리드 프리로드 창 판정', () => {
  it('preloadFromKstDate: days=2 → 오늘·어제(월 경계 포함)', () => {
    expect(preloadFromKstDate('2026-07-10', 2)).toBe('2026-07-09');
    expect(preloadFromKstDate('2026-07-01', 2)).toBe('2026-06-30');
  });

  it('isPreloadedDate: 창 안이면 true, 이전이면 false', () => {
    expect(isPreloadedDate('2026-07-10', '2026-07-09')).toBe(true);
    expect(isPreloadedDate('2026-07-09', '2026-07-09')).toBe(true);
    expect(isPreloadedDate('2026-07-08', '2026-07-09')).toBe(false);
  });
});
