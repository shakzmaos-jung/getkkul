import { describe, it, expect } from 'vitest';
import {
  serviceStatus,
  stageStatuses,
  batchSuccessRate,
  batchFailRate,
} from './derive';
import type { HealthSnapshot } from './types';

const healthy: HealthSnapshot = {
  nowKst: '2026-07-12 17:00',
  lastPipelineRunAgeMin: 14,
  detectFailures: 0,
  acquireFailed3h: 0,
  cookieExpirySuspected: false,
  eligibleUnsummarized: 0,
  deliveryFailures24h: 0,
  failedRuns: [],
  failedVideosPostCutoff: { count: 0, samples: [] },
  deadDataPending: 148,
  today: { detected: 15, summarized: 78, delivered: 3 },
  summarizedRecentMedian: 145,
};

describe('배치 스트립 (AC-OV-1a batch strip)', () => {
  it('건강한 스냅샷은 4단계 모두 정상 + 감지→수집→요약→발송 순서·라벨', () => {
    const stages = stageStatuses(healthy);
    expect(stages.map((s) => s.label)).toEqual(['감지', '수집', '요약', '발송']);
    expect(stages.every((s) => s.ok)).toBe(true);
    expect(stages[0].count).toBe(15); // 감지
    expect(stages[2].count).toBe(78); // 요약
    expect(stages[3].count).toBe(3); // 발송
  });

  it('성공률 = 정상 단계/4', () => {
    expect(batchSuccessRate(healthy)).toBe(1);
    expect(batchFailRate(healthy)).toBe(0);
    const oneDown = { ...healthy, deliveryFailures24h: 2 };
    expect(batchSuccessRate(oneDown)).toBe(0.75);
    expect(batchFailRate(oneDown)).toBeCloseTo(0.25);
  });
});

describe('서비스 상태 3단계 (AC-OV-1a)', () => {
  it('신호 없으면 정상', () => {
    expect(serviceStatus(healthy)).toBe('ok');
  });

  it('배치 실패율 >5%(단계 하나 실패) → 주의 이상', () => {
    const detectDown = { ...healthy, detectFailures: 1 };
    expect(batchFailRate(detectDown)).toBeGreaterThan(0.05);
    expect(serviceStatus(detectDown)).toBe('warn');
  });

  it('요약 백로그 임계 초과 → 주의 이상', () => {
    const backlog = { ...healthy, eligibleUnsummarized: 12 };
    expect(serviceStatus(backlog)).toBe('warn');
  });

  it('발송 실패(있으나 오늘 일부 발송됨) → 주의', () => {
    const someDeliverFail = { ...healthy, deliveryFailures24h: 1 };
    expect(serviceStatus(someDeliverFail)).toBe('warn');
  });

  it('파이프라인 정지(60분+ 무동작 또는 null) → 위험', () => {
    expect(serviceStatus({ ...healthy, lastPipelineRunAgeMin: 90 })).toBe('crit');
    expect(serviceStatus({ ...healthy, lastPipelineRunAgeMin: null })).toBe('crit');
  });

  it('쿠키 만료(수집 불능) → 위험', () => {
    expect(serviceStatus({ ...healthy, cookieExpirySuspected: true })).toBe('crit');
  });

  it('발송 지속 실패(24h 실패>0 & 오늘 발송 0) → 위험', () => {
    const down = { ...healthy, deliveryFailures24h: 5, today: { ...healthy.today, delivered: 0 } };
    expect(serviceStatus(down)).toBe('crit');
  });
});
