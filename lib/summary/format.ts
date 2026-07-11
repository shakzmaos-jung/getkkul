/**
 * 요약 정보 계층 타입 및 검증 (요약품질 SSR 부록 REQ-A/B/C/E).
 * 순수 함수 — 단위 테스트 대상. 값 키는 ADR-0002(short/normal/long).
 *
 * 재정의(요약품질 개선): 길이 모드를 "문장 수"가 아니라 "정보 계층(깊이)"으로 정의한다.
 * - short = TL;DR / normal = 핵심 + 맥락 / long = [핵심 사실] + [맥락·시사점·인사이트] 2단락.
 * - 검증은 문장 수 범위가 아니라 **단조성**(short ≤ normal ≤ long, 정보량 기준)으로 한다(REQ-B1).
 */

export type LengthMode = 'short' | 'normal' | 'long';
export type SummaryLanguage = 'ko' | 'en';
/** 콘텐츠가 무리 없이 제공 가능한 최상위 깊이(적응형 깊이, REQ-C1). */
export type DepthCeiling = LengthMode;

export const LENGTH_MODES: readonly LengthMode[] = ['short', 'normal', 'long'];

const MODE_RANK: Record<LengthMode, number> = { short: 0, normal: 1, long: 2 };

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

/** 요약 문장 1개 + 핵심 여부(하이라이트 마킹, REQ-E1). */
export interface Sentence {
  text: string;
  key: boolean;
}

/** long 2단락 구조: ① 핵심 사실 요약 ② 맥락·시사점·인사이트 (AC-A1.3). */
export interface LongBody {
  facts: Sentence[];
  insights: Sentence[];
}

/** 저장/렌더 호환용 평면 요약(headline + coreText). bullets 는 폐지(항상 []). */
export interface Summary {
  headline: string;
  coreText: string;
  bullets: string[];
}

/** 파생 호환 타입(3모드 평면). */
export interface AllModeSummaries {
  short: Summary;
  normal: Summary;
  long: Summary;
}

/**
 * 모델이 단일 호출로 내는 구조화 결과(정보 계층, REQ-A1/A2).
 * long 은 2단락(facts/insights) + 문장별 핵심 마킹. short/normal 은 평면 coreText.
 */
export interface StructuredSummaries {
  depthCeiling: DepthCeiling;
  short: { headline: string; coreText: string };
  normal: { headline: string; coreText: string };
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

/** long 2단락을 렌더/저장용 평문으로 결합(사실 → 인사이트 순). */
export function longBodyToText(long: LongBody): string {
  return [...(long.facts ?? []), ...(long.insights ?? [])]
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(' ');
}

/** long 에 핵심 문장 하이라이트가 최소 1개 있는가(AC-E1.1). */
export function hasHighlight(long: LongBody): boolean {
  return [...(long.facts ?? []), ...(long.insights ?? [])].some((s) => s.key);
}

export interface MonotonicCheck {
  valid: boolean;
  lengths: Partial<Record<LengthMode, number>>;
}

/**
 * 제공되는 모드들의 정보량이 short ≤ normal ≤ long 으로 단조 증가하는지 판정한다(AC-B1.1).
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
