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
