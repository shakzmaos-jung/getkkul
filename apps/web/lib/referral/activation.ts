import { ACTIVATION_MIN_CHANNELS, ACTIVATION_MIN_SUMMARIES } from './constants';

/**
 * 피추천인 활성화 판정 (REQ-C). 활성화 = (채널 구독 수 ≥ 3) AND (수신 요약 항목 누적 ≥ 10).
 * "요약 항목 수신"은 발송 횟수가 아니라 실제 요약 콘텐츠 건수다(AC-C1.2) —
 * 호출부는 sent 상태의 고유 delivery(=영상) 수를 summaryCount 로 넘긴다.
 */
export function isActivated(channelCount: number, summaryCount: number): boolean {
  return channelCount >= ACTIVATION_MIN_CHANNELS && summaryCount >= ACTIVATION_MIN_SUMMARIES;
}

export interface ActivationProgress {
  channels: { have: number; need: number };
  summaries: { have: number; need: number };
  activated: boolean;
}

/** 화면 표시용 진행률(채널 x/3, 요약 y/10) + 활성화 여부 (AC-G2.1). */
export function activationProgress(channelCount: number, summaryCount: number): ActivationProgress {
  return {
    channels: { have: channelCount, need: ACTIVATION_MIN_CHANNELS },
    summaries: { have: summaryCount, need: ACTIVATION_MIN_SUMMARIES },
    activated: isActivated(channelCount, summaryCount),
  };
}
