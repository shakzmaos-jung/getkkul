/**
 * 요약 길이 모드별 형식 규격 및 검증 (SSR REQ-D2, AC-D2.1/D2.2).
 * 순수 함수 — 단위 테스트 대상. 값 키는 ADR-0002(short/normal/long).
 */

export type LengthMode = 'short' | 'normal' | 'long';
export type SummaryLanguage = 'ko' | 'en';

export interface LengthSpec {
  coreSentencesMin: number;
  coreSentencesMax: number;
  bulletsMin: number;
  bulletsMax: number;
}

/** SSR AC-D2.1: 헤드라인 1줄 + 핵심 문장 + 상세 불릿. */
export const LENGTH_SPECS: Record<LengthMode, LengthSpec> = {
  short: { coreSentencesMin: 1, coreSentencesMax: 3, bulletsMin: 2, bulletsMax: 5 },
  normal: { coreSentencesMin: 1, coreSentencesMax: 7, bulletsMin: 2, bulletsMax: 10 },
  long: { coreSentencesMin: 1, coreSentencesMax: 12, bulletsMin: 10, bulletsMax: 20 },
};

export interface Summary {
  headline: string;
  coreText: string;
  bullets: string[];
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

  const bulletCount = summary.bullets.filter((b) => b.trim().length > 0).length;
  if (bulletCount < spec.bulletsMin || bulletCount > spec.bulletsMax) {
    errors.push(
      `불릿 개수 ${bulletCount}가 범위(${spec.bulletsMin}~${spec.bulletsMax})를 벗어남.`,
    );
  }

  return { valid: errors.length === 0, errors };
}
