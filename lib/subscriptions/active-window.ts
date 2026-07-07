/**
 * 구독 기준선(active_since) 유틸. 일시정지 동안 밀린 콘텐츠가 정지해제 후 노출되지 않도록,
 * "기준선 이후 감지된(created_at) 영상만" 다이제스트로 제공하는 필터. 피드·홈·발송에서 공통 사용.
 */

/** 영상(created_at)이 구독 기준선(since) 이후인지. since 없으면(NULL) 전체 허용. */
export function isAfterActiveSince(
  createdAt: string,
  since: string | null | undefined,
): boolean {
  if (!since) return true;
  return new Date(createdAt).getTime() >= new Date(since).getTime();
}

/** 활성 구독 목록에서 channel_id → active_since 맵을 만든다. */
export function activeSinceByChannel(
  subs: { channel_id: string; active_since: string | null }[],
): Map<string, string | null> {
  return new Map(subs.map((s) => [s.channel_id, s.active_since]));
}
