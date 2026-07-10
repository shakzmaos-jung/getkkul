/**
 * 요약 "읽는 시간 · 압축률" 산정 (피드 카드·홈 목록 공용 — 수치 일관성 보장).
 * 한국어 평균 독서 속도 기준으로 표시 본문 글자수 → 읽는 시간, 영상 길이 대비 압축률.
 */

// 한국어 평균 독서 속도(자/분).
export const CHARS_PER_MIN = 500;

/** 초를 10초 단위로 올림(허용 초: 10/20/30/40/50, 최소 10초). 예 73초 → 80초. */
export function ceil10(sec: number): number {
  return Math.max(10, Math.ceil(sec / 10) * 10);
}

/** 초 → "N시간 N분 N초"(0 단위 생략). 영상 길이(정확)·압축 분량(10초 올림) 공용. */
export function hms(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  if (s > 0) parts.push(`${s}초`);
  return parts.length > 0 ? parts.join(' ') : '0초';
}

export interface ReadingStats {
  hasBody: boolean;
  readText: string; // "N분 N초"(10초 올림)
  compressionPct: number | null; // 영상 길이 대비 압축률(%); 길이 미상이면 null
}

/** 표시 본문(coreText + bullets)과 영상 길이로 읽는 시간·압축률을 계산. */
export function computeReading(
  coreText: string,
  bullets: string[],
  durationSeconds: number | null,
): ReadingStats {
  const bodyPlain = [coreText, ...bullets].join(' ').replace(/\s+/g, '');
  const hasBody = bodyPlain.length > 0;
  const readSeconds = hasBody ? (bodyPlain.length / CHARS_PER_MIN) * 60 : 0;
  const compressionPct =
    durationSeconds && durationSeconds > 0 && readSeconds > 0
      ? Math.max(0, Math.min(99.9, (1 - readSeconds / durationSeconds) * 100))
      : null;
  return { hasBody, readText: hms(ceil10(readSeconds)), compressionPct };
}
