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
    normal: { coreText: '핵심', body: {} },
    short: { coreText: '짧게', body: {} },
  },
  pref_mode: null,
  bookmarked: false,
  feedback: null,
  ...over,
});

describe('mapDigestRow', () => {
  it('RPC 행을 카드로 매핑한다(채널 메타·KST 일자·요약 파싱)', () => {
    const m = mapDigestRow(row(), channels, 'normal', kst)!;
    expect(m.channelTitle).toBe('채널1');
    expect(m.dateKst).toBe('2026-07-10');
    expect(m.summaries.normal?.coreText).toBe('핵심');
    expect(m.initialMode).toBe('normal');
    expect(m.feedback).toEqual({}); // 피드백 없음
  });

  it('영상별 선택(pref_mode)이 있으면 우선한다', () => {
    const m = mapDigestRow(row({ pref_mode: 'short' }), channels, 'normal', kst)!;
    expect(m.initialMode).toBe('short');
  });

  it('long 2단락 body(facts/insights + 하이라이트)를 파싱한다', () => {
    const m = mapDigestRow(
      row({
        summaries: {
          long: {
            coreText: '사실. 인사이트.',
            body: {
              facts: [{ text: '사실 하나.', key: true }],
              insights: [{ text: '인사이트 하나.', key: false }],
            },
          },
        },
      }),
      channels,
      'normal',
      kst,
    )!;
    expect(m.initialMode).toBe('long');
    expect(m.summaries.long?.long?.facts.length).toBe(1);
    expect(m.summaries.long?.long?.facts[0].key).toBe(true);
    expect(m.summaries.long?.long?.insights.length).toBe(1);
  });

  it('AC-C1.3: notProvided 모드는 초기 모드 후보에서 제외', () => {
    const m = mapDigestRow(
      row({
        summaries: {
          short: { coreText: '짧게', body: {} },
          normal: { coreText: '', body: { notProvided: true } },
          long: { coreText: '', body: { notProvided: true } },
        },
      }),
      channels,
      'normal', // 글로벌 normal 이지만 미제공 → short 로
      kst,
    )!;
    expect(m.initialMode).toBe('short');
    expect(m.summaries.normal?.notProvided).toBe(true);
  });

  it('본인 피드백(👍/👎)을 모드별로 매핑', () => {
    const m = mapDigestRow(row({ feedback: { normal: 'up', short: 'down' } }), channels, 'normal', kst)!;
    expect(m.feedback.normal).toBe('up');
    expect(m.feedback.short).toBe('down');
  });

  it('제공 요약이 없으면 null', () => {
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
