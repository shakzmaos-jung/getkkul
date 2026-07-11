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

/** 표시 본문(coreText)과 영상 길이로 읽는 시간·압축률을 계산. */
export function computeReading(coreText: string, durationSeconds: number | null): ReadingStats {
  const bodyPlain = coreText.replace(/\s+/g, '');
  const hasBody = bodyPlain.length > 0;
  const readSeconds = hasBody ? (bodyPlain.length / CHARS_PER_MIN) * 60 : 0;
  const compressionPct =
    durationSeconds && durationSeconds > 0 && readSeconds > 0
      ? Math.max(0, Math.min(99.9, (1 - readSeconds / durationSeconds) * 100))
      : null;
  return { hasBody, readText: hms(ceil10(readSeconds)), compressionPct };
}

export interface ValueSummary {
  videoCount: number;
  originalText: string; // 원본 영상 시간 합계
  readText: string; // 압축된 읽을거리 시간 합계
  savedText: string; // 절약된 시간(원본 − 읽을거리)
  compressionPct: number | null; // 전체 압축률
}

/**
 * 기간 집계(영상 수 · 원본 영상 초 합계 · 본문 글자수 합계) → 지불가치 요약(홈 히어로).
 * 읽는 시간은 글자수/독서속도, 절약 = 원본 − 읽는 시간.
 */
export function computeValueSummary(
  videoCount: number,
  videoSeconds: number,
  readChars: number,
): ValueSummary {
  const readSeconds = readChars > 0 ? (readChars / CHARS_PER_MIN) * 60 : 0;
  const compressionPct =
    videoSeconds > 0 && readSeconds > 0
      ? Math.max(0, Math.min(99.9, (1 - readSeconds / videoSeconds) * 100))
      : null;
  const savedSeconds = Math.max(0, videoSeconds - readSeconds);
  return {
    videoCount,
    originalText: hms(videoSeconds),
    readText: hms(ceil10(readSeconds)),
    savedText: hms(savedSeconds),
    compressionPct,
  };
}
