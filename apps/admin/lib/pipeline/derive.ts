// 파이프라인 모듈 표현 로직 — 순수 TS(테스트 대상). RPC 원자료 → 표시용 파생값.
import type { ChannelRow, PipelineStage, RetryQueue } from './types';

/** 채널 표 합계 (AC-PI-1b). */
export function channelTotals(channels: ChannelRow[]) {
  return channels.reduce(
    (a, c) => ({
      new: a.new + c.new,
      summarized: a.summarized + c.summarized,
      pending: a.pending + c.pending,
      processing: a.processing + c.processing,
      failed: a.failed + c.failed,
    }),
    { new: 0, summarized: 0, pending: 0, processing: 0, failed: 0 },
  );
}

/** 재시도 큐 총량. */
export function retryQueueTotal(rq: RetryQueue): number {
  return rq.dueNow + rq.waiting + rq.permanentFailures + rq.exhaustedTransient;
}

/** 소요시간 표기 (발송 등 미기록은 '—'). */
export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return '—';
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

/** 발송 성공률 (AC-PI-1c) = sent / (sent + failed). 발송 단계에만, 데이터 없으면 null. */
export function deliverySuccessRate(stage: PipelineStage): number | null {
  if (stage.key !== 'deliver') return null;
  const sent = stage.counts.delivered ?? 0;
  const failed = stage.counts.failures ?? 0;
  const total = sent + failed;
  return total === 0 ? null : sent / total;
}

/**
 * 발송 단계 서브라벨(AC-PI-1c를 UI에 노출하는 문자열). 발송 단계+데이터 있을 때만.
 * StageTimeline이 이 값을 렌더 → "계산했지만 표시 안 함" 회귀를 테스트로 차단.
 */
export function deliverStageSubLabel(stage: PipelineStage): string | null {
  const rate = deliverySuccessRate(stage);
  if (rate === null) return null;
  return `성공률 ${Math.round(rate * 100)}% · 실패 ${stage.counts.failures ?? 0}`;
}
