import { describe, it, expect } from 'vitest';
import { buildReport, evaluateIssues, type HealthSnapshot } from './health-check';

const healthy: HealthSnapshot = {
  nowKst: '07-12 12:24',
  lastPipelineRunAgeMin: 16,
  failedRuns: [],
  detectFailures: 0,
  acquireFailed3h: 0,
  cookieExpirySuspected: false,
  failedVideosPostCutoff: { count: 1, samples: [{ title: '라이브', error: 'yt-dlp' }] },
  eligibleUnsummarized: 0,
  deliveryFailures24h: 0,
  deadDataPending: 148,
  today: { detected: 8, summarized: 72, delivered: 3 },
  summarizedRecentMedian: 140,
};

describe('evaluateIssues', () => {
  it('정상 스냅샷은 이상 없음', () => {
    expect(evaluateIssues(healthy)).toEqual([]);
  });

  it('컷오프 이전 dead data(pending 148)와 개별 영구실패 1건은 알람하지 않음', () => {
    const r = buildReport(healthy);
    expect(r.ok).toBe(true);
    expect(r.subject).toContain('✅ 정상');
    // 참고 정보로는 노출되지만 이상 목록에는 없음
    expect(r.text).toContain('pending 148건');
    expect(r.issues).toHaveLength(0);
  });

  it('요약 누락은 이상으로 잡는다', () => {
    const issues = evaluateIssues({ ...healthy, eligibleUnsummarized: 3 });
    expect(issues.some((i) => i.includes('요약 누락 3건'))).toBe(true);
  });

  it('런 지연(60분 초과)은 이상', () => {
    expect(evaluateIssues({ ...healthy, lastPipelineRunAgeMin: 90 })[0]).toContain('파이프라인 런 지연');
  });

  it('런 기록 없음은 이상', () => {
    expect(evaluateIssues({ ...healthy, lastPipelineRunAgeMin: null })[0]).toContain('런 기록 없음');
  });

  it('감지 실패·발송 실패·쿠키 만료·실패 급증을 각각 잡는다', () => {
    expect(evaluateIssues({ ...healthy, detectFailures: 2 }).some((i) => i.includes('채널 감지 실패'))).toBe(true);
    expect(evaluateIssues({ ...healthy, deliveryFailures24h: 1 }).some((i) => i.includes('발송 실패'))).toBe(true);
    expect(evaluateIssues({ ...healthy, cookieExpirySuspected: true }).some((i) => i.includes('쿠키 만료'))).toBe(true);
    expect(
      evaluateIssues({ ...healthy, failedVideosPostCutoff: { count: 12, samples: [] } }).some((i) =>
        i.includes('실패 급증'),
      ),
    ).toBe(true);
  });
});

describe('buildReport', () => {
  it('이상 시 제목에 건수와 상태를 인코딩', () => {
    const r = buildReport({ ...healthy, eligibleUnsummarized: 3, deliveryFailures24h: 1 });
    expect(r.ok).toBe(false);
    expect(r.subject).toContain('⚠️ 이상 2건');
    expect(r.text).toContain('이상 목록');
    expect(r.html).toContain('이상 목록');
  });

  it('html 은 사용자 값을 이스케이프', () => {
    const r = buildReport({
      ...healthy,
      failedVideosPostCutoff: { count: 1, samples: [{ title: '<script>', error: 'x' }] },
    });
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
  });
});
