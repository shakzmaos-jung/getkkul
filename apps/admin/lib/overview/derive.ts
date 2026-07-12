// 관제 홈 파생 로직 — 순수 TS(테스트 대상). RPC 원자료 → 상태 3단계·배치 스트립·성공률.
// 임계값은 기존 파이프라인 헬스체크(apps/web/lib/pipeline/health-check.ts)와 정합.
import type { HealthSnapshot } from './types';

export const STALE_PIPELINE_MIN = 60; // 이 시간 넘게 파이프라인 무동작이면 정지로 간주
export const FAILED_VIDEO_THRESHOLD = 10; // 컷오프 이후 실패 영상 임계

export type ServiceStatus = 'ok' | 'warn' | 'crit'; // 정상 / 주의 / 위험

export type StageId = 'detect' | 'acquire' | 'summarize' | 'deliver';
export type BatchStage = {
  id: StageId;
  label: string;
  ok: boolean;
  count: number | null; // 오늘 건수(수집 단계는 별도 집계 없음 → null)
};

function pipelineStalled(h: HealthSnapshot): boolean {
  return h.lastPipelineRunAgeMin === null || h.lastPipelineRunAgeMin > STALE_PIPELINE_MIN;
}

/** 4단계 배치 스트립: 감지→수집→요약→발송, 각 단계 ok + 오늘 건수. */
export function stageStatuses(h: HealthSnapshot): BatchStage[] {
  const detectOk = h.detectFailures === 0 && !pipelineStalled(h);
  const acquireOk =
    !h.cookieExpirySuspected &&
    h.failedVideosPostCutoff.count < FAILED_VIDEO_THRESHOLD &&
    h.acquireFailed3h === 0;
  const summarizeOk = h.eligibleUnsummarized === 0;
  const deliverOk = h.deliveryFailures24h === 0;
  return [
    { id: 'detect', label: '감지', ok: detectOk, count: h.today.detected },
    { id: 'acquire', label: '수집', ok: acquireOk, count: null },
    { id: 'summarize', label: '요약', ok: summarizeOk, count: h.today.summarized },
    { id: 'deliver', label: '발송', ok: deliverOk, count: h.today.delivered },
  ];
}

/** 오늘 배치 성공률 = 정상 단계 / 4. (AC-OV-1b KPI②) */
export function batchSuccessRate(h: HealthSnapshot): number {
  const stages = stageStatuses(h);
  return stages.filter((s) => s.ok).length / stages.length;
}

/** 배치 실패율 = 실패 단계 / 4. */
export function batchFailRate(h: HealthSnapshot): number {
  return 1 - batchSuccessRate(h);
}

/**
 * 서비스 상태 3단계 (AC-OV-1a).
 * - 위험: 파이프라인 정지 || 쿠키 만료(수집 불능) || 발송 지속 실패(24h 실패>0 & 오늘 발송 0)
 * - 주의: 배치 실패율 >5%(=단계 하나라도 실패) || 요약 백로그 초과 || 감지 실패 || 발송 실패 || 최근 실패 run
 * - 정상: 위 신호 없음
 */
export function serviceStatus(h: HealthSnapshot): ServiceStatus {
  const deliveryDown = h.deliveryFailures24h > 0 && h.today.delivered === 0;
  if (pipelineStalled(h) || h.cookieExpirySuspected || deliveryDown) {
    return 'crit';
  }
  if (
    batchFailRate(h) > 0.05 ||
    h.eligibleUnsummarized > 0 ||
    h.detectFailures > 0 ||
    h.deliveryFailures24h > 0 ||
    h.acquireFailed3h > 0 ||
    h.failedVideosPostCutoff.count >= FAILED_VIDEO_THRESHOLD ||
    h.failedRuns.length > 0
  ) {
    return 'warn';
  }
  return 'ok';
}

export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  ok: '정상',
  warn: '주의',
  crit: '위험',
};
