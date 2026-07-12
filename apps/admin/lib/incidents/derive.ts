// 인시던트 파생 — 순수 TS(테스트 대상). 헬스 신호 → 현재 활성 인시던트(심각/보통 분류, AC-AL-1b).
// 운영자 알림(쿠키 만료·발송 실패 등, AC-AL-1a)이 이메일 전용이라, 같은 신호에서 파생한다.
import type { HealthSnapshot } from '@/lib/overview/types';

export type Severity = 'critical' | 'normal'; // 심각 / 보통

export type Incident = {
  id: string;
  severity: Severity;
  label: string;
  detail: string;
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '심각',
  normal: '보통',
};

/** 알림 규칙(심각/보통 분리 표시, AC-AL-1b). */
export const ALERT_RULES: { severity: Severity; label: string; trigger: string }[] = [
  { severity: 'critical', label: '파이프라인 정지', trigger: '60분+ 무동작' },
  { severity: 'critical', label: '쿠키 만료(수집 중단)', trigger: '봇차단·쿠키 만료 의심' },
  { severity: 'critical', label: '발송 전면 실패', trigger: '24h 실패>0 & 오늘 발송 0' },
  { severity: 'normal', label: '요약 백로그', trigger: '미요약 대상>0' },
  { severity: 'normal', label: '감지 실패', trigger: 'RSS+API 감지 실패>0' },
  { severity: 'normal', label: '실패 영상 임계', trigger: '컷오프 후 실패 영상 ≥10' },
  { severity: 'normal', label: '발송 일부 실패', trigger: '24h 발송 실패>0' },
];

const STALE_PIPELINE_MIN = 60;
const FAILED_VIDEO_THRESHOLD = 10;

/** 현재 활성 인시던트 (AC-AL-1a). 심각 먼저. */
export function activeIncidents(h: HealthSnapshot): Incident[] {
  const out: Incident[] = [];
  const stalled = h.lastPipelineRunAgeMin === null || h.lastPipelineRunAgeMin > STALE_PIPELINE_MIN;

  // 심각(즉시)
  if (stalled) {
    out.push({ id: 'pipeline-stalled', severity: 'critical', label: '파이프라인 정지',
      detail: `마지막 실행 ${h.lastPipelineRunAgeMin ?? '?'}분 전` });
  }
  if (h.cookieExpirySuspected) {
    out.push({ id: 'cookie-expiry', severity: 'critical', label: '쿠키 만료 의심',
      detail: '수집(전사) 중단 위험' });
  }
  if (h.deliveryFailures24h > 0 && h.today.delivered === 0) {
    out.push({ id: 'delivery-down', severity: 'critical', label: '발송 전면 실패',
      detail: `24h 발송 실패 ${h.deliveryFailures24h}` });
  }

  // 보통(다음)
  if (h.eligibleUnsummarized > 0) {
    out.push({ id: 'summary-backlog', severity: 'normal', label: '요약 백로그',
      detail: `미요약 ${h.eligibleUnsummarized}건` });
  }
  if (h.detectFailures > 0) {
    out.push({ id: 'detect-fail', severity: 'normal', label: '감지 실패',
      detail: `${h.detectFailures}건` });
  }
  if (h.failedVideosPostCutoff.count >= FAILED_VIDEO_THRESHOLD) {
    out.push({ id: 'failed-videos', severity: 'normal', label: '실패 영상 임계',
      detail: `${h.failedVideosPostCutoff.count}건` });
  }
  if (h.deliveryFailures24h > 0 && h.today.delivered > 0) {
    out.push({ id: 'delivery-partial', severity: 'normal', label: '발송 일부 실패',
      detail: `24h 발송 실패 ${h.deliveryFailures24h}` });
  }

  return out;
}

/** 활성 인시던트 수 (Overview ⑥ 열린 인시던트 연동). */
export function activeIncidentCount(h: HealthSnapshot): number {
  return activeIncidents(h).length;
}
