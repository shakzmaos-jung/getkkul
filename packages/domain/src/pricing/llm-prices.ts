// LLM 가격표 (SSR §5.4, ADR-A4). **가격 변동 시 이 파일만 수정**(코드 배포 무관).
// 단가 = USD / 1M 토큰. 출처: OpenAI gpt-5-nano 청구 기준, 사용자 확인 2026-07-12.

export type LlmPrice = {
  /** 입력(프롬프트) 1M 토큰당 USD */
  inputPerMTok: number;
  /** 출력(완성) 1M 토큰당 USD */
  outputPerMTok: number;
  /** 캐시된 입력 1M 토큰당 USD (별도 계측 시에만 적용) */
  cachedInputPerMTok?: number;
};

// ── 실제 단가 (변경 시 여기만 수정) ─────────────────────────────
export const LLM_PRICES: Record<string, LlmPrice> = {
  'gpt-5-nano': {
    inputPerMTok: 0.2,
    outputPerMTok: 1.25,
    cachedInputPerMTok: 0.02,
  },
};
// ────────────────────────────────────────────────────────────

export const DEFAULT_MODEL = 'gpt-5-nano';

/**
 * 토큰 → USD (AC-CO-1a). cachedTokens 는 현재 계측되지 않으므로 기본 0
 * (캐시 토큰을 별도 계측하게 되면 cachedInputPerMTok 단가로 반영).
 */
export function computeUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0,
): number {
  const p = LLM_PRICES[model];
  if (!p) return 0;
  const uncached = Math.max(0, promptTokens - cachedTokens);
  const input = uncached * (p.inputPerMTok / 1_000_000);
  const cached = cachedTokens * ((p.cachedInputPerMTok ?? p.inputPerMTok) / 1_000_000);
  const output = completionTokens * (p.outputPerMTok / 1_000_000);
  return input + cached + output;
}

// ── 입력:출력 토큰 비율 임계 배지 (AC-CO-1b) ───────────────────
export type RatioBadge = 'excellent' | 'normal' | 'investigate' | 'critical';

/** 입력:출력 비율 = prompt / completion. 출력 0이면 null. */
export function inputOutputRatio(
  promptTokens: number,
  completionTokens: number,
): number | null {
  if (completionTokens <= 0) return null;
  return promptTokens / completionTokens;
}

/** <10 우수 / 10–25 정상 / 25–50 조사 / >50 심각 (AC-CO-1b). */
export function ratioBadge(ratio: number): RatioBadge {
  if (ratio < 10) return 'excellent';
  if (ratio < 25) return 'normal';
  if (ratio <= 50) return 'investigate';
  return 'critical';
}

export const RATIO_BADGE_LABEL: Record<RatioBadge, string> = {
  excellent: '우수',
  normal: '정상',
  investigate: '조사',
  critical: '심각',
};
