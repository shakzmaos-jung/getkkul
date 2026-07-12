import { describe, it, expect } from 'vitest';
import { viewContent, viewAvailable, enumToView, resolveInitialView, VIEW_ENUM } from './card-views';
import type { ModeSummary } from './map-digests';

const summaries: Partial<Record<'short' | 'normal' | 'long', ModeSummary>> = {
  short: { coreText: '요점1\n요점2', points: ['요점1', '요점2'] },
  normal: { coreText: 'n', points: ['n1', 'n2'] },
  long: {
    coreText: '사실1\n사실2\n인사이트1',
    long: { facts: ['사실1', '사실2'], insights: ['인사이트1'] },
  },
};

describe('card-views (간단히/자세히/인사이트)', () => {
  it('뷰별 콘텐츠 파생: 간단히=short.points, 자세히=long.facts, 인사이트=long.insights', () => {
    expect(viewContent(summaries, 'simple').bullets).toEqual(['요점1', '요점2']);
    expect(viewContent(summaries, 'detail').bullets).toEqual(['사실1', '사실2']);
    expect(viewContent(summaries, 'insight').bullets).toEqual(['인사이트1']);
    expect(viewContent(summaries, 'detail').text).toBe('사실1\n사실2');
  });

  it('뷰 → enum: 간단히=short, 자세히·인사이트=long(공유)', () => {
    expect(VIEW_ENUM).toEqual({ simple: 'short', detail: 'long', insight: 'long' });
    expect(enumToView('short')).toBe('simple');
    expect(enumToView('normal')).toBe('detail');
    expect(enumToView('long')).toBe('detail');
  });

  it('long 미제공이면 자세히·인사이트 비가용, 간단히만', () => {
    const shallow: Partial<Record<'short' | 'long', ModeSummary>> = {
      short: { coreText: 's', points: ['s'] },
      long: { coreText: '', notProvided: true },
    };
    expect(viewAvailable(shallow, 'simple')).toBe(true);
    expect(viewAvailable(shallow, 'detail')).toBe(false);
    expect(viewAvailable(shallow, 'insight')).toBe(false);
    expect(resolveInitialView(shallow, 'long')).toBe('simple'); // 자세히 미가용 → 간단히
  });

  it('초기 뷰: 선호(enum)가 가용하면 그것', () => {
    expect(resolveInitialView(summaries, 'short')).toBe('simple');
    expect(resolveInitialView(summaries, 'normal')).toBe('detail');
    expect(resolveInitialView(summaries, 'long')).toBe('detail');
  });
});
