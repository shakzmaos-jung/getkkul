/**
 * 영상 길이 유틸.
 * - parseIso8601Duration: YouTube Data API contentDetails.duration(ISO8601) → 초.
 * - formatDuration: 초 → 표시 문자열(m:ss / h:mm:ss).
 */

/** ISO8601 duration('PT12M34S') 을 초로 파싱. 길이 없음(P0D)·0·무효값은 null. */
export function parseIso8601Duration(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const s = m[3] ? parseInt(m[3], 10) : 0;
  const total = h * 3600 + min * 60 + s;
  return total > 0 ? total : null;
}

/** 초 → 'm:ss'(1시간 미만) 또는 'h:mm:ss'. null·0·음수·비유한값은 ''. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// 다이제스트 영상 길이 필터 정책.
export const MIN_DIGEST_DURATION_SEC = 120; // 2분 미만(Shorts 등) — 항상 제외(설정 불가)
export const LONG_DIGEST_DURATION_SEC = 7200; // 2시간 이상 — excludeOver2h 옵션(기본 제외)
// 2분 하한 시행 시각(소급 미적용). 이 시각 이전 감지분은 기존대로 유지하고, 이후 감지분부터 적용한다.
// 판정 자체는 신규 생성 경로(요약 게이트·발송)에 적용되고, 읽기(get_feed_digests)는 created_at 기준
// 그랜드파더링으로 기존 노출분을 숨기지 않는다(supabase/migrations/20260713030000).
export const MIN_DURATION_POLICY_FROM = '2026-07-13T00:00:00+09:00';

/**
 * 다이제스트 노출 대상 판정(신규 생성·발송 경로).
 * - 2분 미만: 항상 제외(1분 넘는 숏츠도 짧은 영상 요약 품질이 낮아 함께 제외).
 * - 2시간 이상: excludeOver2h 일 때 제외.
 * - 길이 미상(null): 이 필터로는 통과(라이브/미취득은 요약 단계에서 별도 제외됨).
 */
export function passesDurationFilters(
  durationSeconds: number | null,
  excludeOver2h: boolean,
): boolean {
  if (durationSeconds == null) return true;
  if (durationSeconds < MIN_DIGEST_DURATION_SEC) return false;
  if (excludeOver2h && durationSeconds >= LONG_DIGEST_DURATION_SEC) return false;
  return true;
}
