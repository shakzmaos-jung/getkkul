/**
 * 요약 정보 계층 타입 및 검증 (요약품질 SSR 부록 REQ-A/B/C, ADR-0013/0014).
 * 순수 함수 — 단위 테스트 대상. 값 키는 ADR-0002(short/normal/long).
 *
 * 정보 계층(깊이): 요점(short)=무엇을 다뤘나+핵심 사실 / 핵심(normal)=맥락·개념 누락 없이 핵심 사실 /
 * 심층(long)=핵심 사실(부가·수치·예시 확장) + 맥락·인사이트. 각 모드는 **불릿 배열**로 표현한다.
 * 검증은 문장 수가 아니라 **단조성**(요점 ≤ 핵심 ≤ 심층, 정보량 기준)으로 한다. 하이라이트는 폐지(ADR-0014).
 */

export type LengthMode = 'short' | 'normal' | 'long';
export type SummaryLanguage = 'ko' | 'en';
/** 콘텐츠가 무리 없이 제공 가능한 최상위 깊이(적응형 깊이, REQ-C1). */
export type DepthCeiling = LengthMode;

export const LENGTH_MODES: readonly LengthMode[] = ['short', 'normal', 'long'];

const MODE_RANK: Record<LengthMode, number> = { short: 0, normal: 1, long: 2 };

/** 모드 라벨·설명(정보 양·깊이 의역, 카드/설정 공용 단일 소스). */
export const MODE_LABELS: Record<LengthMode, string> = { short: '요점', normal: '핵심', long: '심층' };
export const MODE_DESC: Record<LengthMode, string> = {
  short: '무엇을 다뤘나 + 핵심 사실 (10~30초)',
  normal: '맥락·개념 누락 없이 핵심 사실',
  long: '핵심 사실 + 수치·예시 + 맥락·인사이트',
};

/** 임의 값이 유효한 길이 모드인지 판정한다(폼 입력 검증용). */
export function isLengthMode(value: unknown): value is LengthMode {
  return typeof value === 'string' && (LENGTH_MODES as readonly string[]).includes(value);
}

/** ceiling 이하(=실제 제공되는) 모드들. 상위 모드는 "제공 안 함"(AC-C1.3). */
export function providedModes(ceiling: DepthCeiling): LengthMode[] {
  return LENGTH_MODES.filter((m) => MODE_RANK[m] <= MODE_RANK[ceiling]);
}

/** 해당 모드가 콘텐츠 깊이 안에서 제공되는가. */
export function isProvided(mode: LengthMode, ceiling: DepthCeiling): boolean {
  return MODE_RANK[mode] <= MODE_RANK[ceiling];
}

/** 심층(long) 2단락 구조: ① 핵심 사실 ② 맥락·시사점·인사이트. 각 항목은 불릿 문장(평문). */
export interface LongBody {
  facts: string[];
  insights: string[];
}

/**
 * 모델이 단일 호출로 내는 구조화 결과(정보 계층, REQ-A1).
 * 요점/핵심은 불릿 배열(points), 심층은 facts/insights 불릿 배열.
 */
export interface StructuredSummaries {
  depthCeiling: DepthCeiling;
  short: { headline: string; points: string[] };
  normal: { headline: string; points: string[] };
  long: { headline: string } & LongBody;
}

/** 핵심 텍스트의 문장 수를 센다(한국어 '다.'·영어 문장부호 기준, 근사). */
export function countSentences(text: string): number {
  return text
    .split(/[.!?。]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

/** 공백 제외 글자수 = 정보량 근사(단조성 판정 기준, AC-B1.1). */
export function informationLength(text: string): number {
  return (text ?? '').replace(/\s+/g, '').length;
}

/** 불릿 배열 → 저장/렌더용 평문(줄바꿈 결합). 빈 항목 제거. */
export function pointsToText(points: string[]): string {
  return (points ?? []).map((p) => (p ?? '').trim()).filter(Boolean).join('\n');
}

/** 심층 2단락(facts→insights)을 평문으로 결합(core_text 정본용). */
export function longBodyToText(long: LongBody): string {
  return pointsToText([...(long.facts ?? []), ...(long.insights ?? [])]);
}

export interface MonotonicCheck {
  valid: boolean;
  lengths: Partial<Record<LengthMode, number>>;
}

/**
 * 제공되는 모드들의 정보량이 요점 ≤ 핵심 ≤ 심층으로 단조 증가하는지 판정한다(AC-B1.1).
 * 누락(제공 안 함) 모드는 판정에서 제외한다.
 */
export function checkMonotonicity(textByMode: Partial<Record<LengthMode, string>>): MonotonicCheck {
  const lengths: Partial<Record<LengthMode, number>> = {};
  for (const m of LENGTH_MODES) {
    if (textByMode[m] != null) lengths[m] = informationLength(textByMode[m]!);
  }
  const provided = LENGTH_MODES.filter((m) => lengths[m] != null);
  let valid = true;
  for (let i = 1; i < provided.length; i++) {
    if ((lengths[provided[i]] ?? 0) < (lengths[provided[i - 1]] ?? 0)) valid = false;
  }
  return { valid, lengths };
}
