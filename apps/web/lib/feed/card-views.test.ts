import { describe, it, expect } from 'vitest';
import { viewContent, viewAvailable, enumToView, resolveInitialView, VIEW_ENUM } from './card-views';
import type { ModeSummary } from './map-digests';

const summaries: Partial<Record<'short' | 'normal' | 'long', ModeSummary>> = {
  short: { coreText: '요점1\n요점2', points: ['요점1', '요점2'] },
  normal: { coreText: 'n1\nn2', points: ['n1', 'n2'] },
  long: {
    coreText: '사실1\n사실2\n함의1',
    long: { facts: ['사실1', '사실2'], insights: ['함의1'] },
  },
};

describe('card-views (상세도 스펙트럼: 간단히/자세히/최대한)', () => {
  it('뷰별 콘텐츠: 간단히=short, 자세히=normal, 최대한=long(facts+insights 결합)', () => {
    expect(viewContent(summaries, 'simple').bullets).toEqual(['요점1', '요점2']);
    expect(viewContent(summaries, 'detail').bullets).toEqual(['n1', 'n2']);
    expect(viewContent(summaries, 'full').bullets).toEqual(['사실1', '사실2', '함의1']);
    expect(viewContent(summaries, 'full').text).toBe('사실1\n사실2\n함의1');
  });

  it('뷰 ↔ enum: 3모드 1:1(탭별 선호·피드백 구분 저장 가능)', () => {
    expect(VIEW_ENUM).toEqual({ simple: 'short', detail: 'normal', full: 'long' });
    expect(enumToView('short')).toBe('simple');
    expect(enumToView('normal')).toBe('detail');
    expect(enumToView('long')).toBe('full');
  });

  it('상위 모드 미제공이면 해당 탭 비가용, 간단히로 폴백', () => {
    const shallow: Partial<Record<'short' | 'normal' | 'long', ModeSummary>> = {
      short: { coreText: 's', points: ['s'] },
      normal: { coreText: '', notProvided: true },
      long: { coreText: '', notProvided: true },
    };
    expect(viewAvailable(shallow, 'simple')).toBe(true);
    expect(viewAvailable(shallow, 'detail')).toBe(false);
    expect(viewAvailable(shallow, 'full')).toBe(false);
    expect(resolveInitialView(shallow, 'long')).toBe('simple'); // 최대한 미가용 → 간단히
  });

  it('초기 뷰: 선호(enum)가 가용하면 그것', () => {
    expect(resolveInitialView(summaries, 'short')).toBe('simple');
    expect(resolveInitialView(summaries, 'normal')).toBe('detail');
    expect(resolveInitialView(summaries, 'long')).toBe('full');
  });

  it('하위호환: 기존 영상(normal 있음, long facts/insights)도 새 매핑으로 즉시 표시', () => {
    expect(viewAvailable(summaries, 'detail')).toBe(true); // normal → 자세히
    expect(viewAvailable(summaries, 'full')).toBe(true); // long facts+insights → 최대한
  });
});
