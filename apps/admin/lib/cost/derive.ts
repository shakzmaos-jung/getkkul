// 비용 파생 로직 — @getkkul/domain 가격표로 토큰 → USD (AC-CO-1a/b).
import {
  computeUsd,
  inputOutputRatio,
  ratioBadge,
  type RatioBadge,
} from '@getkkul/domain';
import type { CostBreakdown } from './types';

export type DailyUsd = { day: string; usd: number };

export function dailyUsd(cb: CostBreakdown): DailyUsd[] {
  return cb.daily.map((d) => ({
    day: d.day,
    usd: computeUsd(cb.model, d.promptTokens, d.completionTokens),
  }));
}

export function totalUsd(cb: CostBreakdown): number {
  return computeUsd(cb.model, cb.totals.promptTokens, cb.totals.completionTokens);
}

export function costRatio(cb: CostBreakdown): {
  ratio: number | null;
  badge: RatioBadge | null;
} {
  const ratio = inputOutputRatio(
    cb.totals.promptTokens,
    cb.totals.completionTokens,
  );
  return { ratio, badge: ratio === null ? null : ratioBadge(ratio) };
}

/** USD 표기: 1센트 미만은 소수 4자리(관측 가능하게), 그 외 2자리. */
export function formatUsd(usd: number): string {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
