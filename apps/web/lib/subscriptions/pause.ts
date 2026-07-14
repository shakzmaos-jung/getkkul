/** 구독 일시정지 사유 (subscriptions.pause_reason). null = 정지 아님. */
export type PauseReason = 'manual' | 'downgrade' | null;

/** 멤버십 플랜 한도로 자동 정지된 채널인가('downgrade'=한도초과·다운그레이드 공통). 상위 플랜에서 사용자가 직접 해제. */
export function isAutoPaused(reason: PauseReason): boolean {
  return reason === 'downgrade';
}

/** 일시정지 탭에 표시할 사유 문구. */
export function pauseReasonLabel(reason: PauseReason): string {
  if (reason === 'downgrade') return '멤버십 플랜 한도로 자동 일시정지 · 상위 플랜에서 직접 정지 해제';
  return '직접 정지함';
}
