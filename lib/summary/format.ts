/**
 * 요약 길이 모드별 형식 규격 및 검증 (SSR REQ-D2, AC-D2.1/D2.2).
 * 순수 함수 — 단위 테스트 대상. 값 키는 ADR-0002(short/normal/long).
 */

export type LengthMode = 'short' | 'normal' | 'long';
export type SummaryLanguage = 'ko' | 'en';

export const LENGTH_MODES: readonly LengthMode[] = ['short', 'normal', 'long'];

/** 임의 값이 유효한 길이 모드인지 판정한다(폼 입력 검증용). */
export function isLengthMode(value: unknown): value is LengthMode {
  return typeof value === 'string' && (LENGTH_MODES as readonly string[]).includes(value);
}

export interface LengthSpec {
  coreSentencesMin: number;
  coreSentencesMax: number;
}

/** 헤드라인 1줄 + 핵심 문장(coreText). 불릿은 폐지 — long 은 coreText 로 상세를 흡수. */
export const LENGTH_SPECS: Record<LengthMode, LengthSpec> = {
  short: { coreSentencesMin: 1, coreSentencesMax: 3 },
  normal: { coreSentencesMin: 1, coreSentencesMax: 7 },
  long: { coreSentencesMin: 5, coreSentencesMax: 18 },
};

export interface Summary {
  headline: string;
  coreText: string;
  bullets: string[]; // 폐지(항상 []) — 저장/타입 호환 위해 필드는 유지.
}

/** 핵심 텍스트의 문장 수를 센다(한국어 '다.'·영어 문장부호 기준, 근사). */
export function countSentences(text: string): number {
  return text
    .split(/[.!?。]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

export interface FormatCheck {
  valid: boolean;
  errors: string[];
}

/** 생성된 요약이 선택 모드의 형식 조건을 만족하는지 검증한다(AC-D2.2). */
export function validateSummaryFormat(summary: Summary, mode: LengthMode): FormatCheck {
  const spec = LENGTH_SPECS[mode];
  const errors: string[] = [];

  if (!summary.headline || summary.headline.trim().length === 0) {
    errors.push('헤드라인이 비어 있습니다.');
  }

  const sentences = countSentences(summary.coreText);
  if (sentences < spec.coreSentencesMin || sentences > spec.coreSentencesMax) {
    errors.push(
      `핵심 문장 수 ${sentences}가 범위(${spec.coreSentencesMin}~${spec.coreSentencesMax})를 벗어남.`,
    );
  }

  return { valid: errors.length === 0, errors };
}
