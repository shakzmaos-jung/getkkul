import { describe, it, expect } from 'vitest';
import { activeIncidents, activeIncidentCount, ALERT_RULES } from './derive';
import type { HealthSnapshot } from '@/lib/overview/types';

const healthy: HealthSnapshot = {
  nowKst: '2026-07-12 20:00',
  lastPipelineRunAgeMin: 10,
  detectFailures: 0,
  acquireFailed3h: 0,
  cookieExpirySuspected: false,
  eligibleUnsummarized: 0,
  deliveryFailures24h: 0,
  failedRuns: [],
  failedVideosPostCutoff: { count: 0, samples: [] },
  deadDataPending: 0,
  today: { detected: 10, summarized: 50, delivered: 3 },
  summarizedRecentMedian: 100,
};

describe('activeIncidents (AC-AL-1a/b)', () => {
  it('건강하면 인시던트 0', () => {
    expect(activeIncidents(healthy)).toEqual([]);
    expect(activeIncidentCount(healthy)).toBe(0);
  });

  it('심각: 파이프라인 정지 / 쿠키 만료 / 발송 전면 실패', () => {
    expect(activeIncidents({ ...healthy, lastPipelineRunAgeMin: 90 })[0]).toMatchObject({ severity: 'critical', id: 'pipeline-stalled' });
    expect(activeIncidents({ ...healthy, lastPipelineRunAgeMin: null })[0].severity).toBe('critical');
    expect(activeIncidents({ ...healthy, cookieExpirySuspected: true })[0]).toMatchObject({ severity: 'critical', id: 'cookie-expiry' });
    const down = activeIncidents({ ...healthy, deliveryFailures24h: 5, today: { ...healthy.today, delivered: 0 } });
    expect(down.find((i) => i.id === 'delivery-down')?.severity).toBe('critical');
  });

  it('보통: 요약 백로그 / 감지 실패 / 실패 영상 임계 / 발송 일부 실패', () => {
    expect(activeIncidents({ ...healthy, eligibleUnsummarized: 5 })[0]).toMatchObject({ severity: 'normal', id: 'summary-backlog' });
    expect(activeIncidents({ ...healthy, detectFailures: 2 }).some((i) => i.id === 'detect-fail')).toBe(true);
    expect(activeIncidents({ ...healthy, failedVideosPostCutoff: { count: 12, samples: [] } }).some((i) => i.id === 'failed-videos')).toBe(true);
    const partial = activeIncidents({ ...healthy, deliveryFailures24h: 1 });
    expect(partial.find((i) => i.id === 'delivery-partial')?.severity).toBe('normal');
  });

  it('여러 신호 동시 → 심각이 보통보다 먼저', () => {
    const both = activeIncidents({ ...healthy, cookieExpirySuspected: true, eligibleUnsummarized: 3 });
    expect(both[0].severity).toBe('critical');
    expect(both.some((i) => i.severity === 'normal')).toBe(true);
  });

  it('알림 규칙은 심각/보통으로 분리 정의됨 (AC-AL-1b)', () => {
    expect(ALERT_RULES.some((r) => r.severity === 'critical')).toBe(true);
    expect(ALERT_RULES.some((r) => r.severity === 'normal')).toBe(true);
  });
});
