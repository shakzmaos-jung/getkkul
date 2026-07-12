/** 구독 일시정지 사유 (subscriptions.pause_reason). null = 정지 아님. */
export type PauseReason = 'manual' | 'downgrade' | null;

/** 멤버십 다운그레이드로 자동 정지된 채널인가(업그레이드 시 자동 복원, 수동 해제 불가). */
export function isAutoPaused(reason: PauseReason): boolean {
  return reason === 'downgrade';
}

/** 일시정지 탭에 표시할 사유 문구. */
export function pauseReasonLabel(reason: PauseReason): string {
  if (reason === 'downgrade') return '멤버십 다운그레이드로 자동 정지 · 업그레이드 시 자동 복원';
  return '직접 정지함';
}
