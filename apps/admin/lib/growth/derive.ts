// 그로스 표현 로직 — 순수 TS(테스트 대상).
import type { GrowthFunnel } from './types';

/** 비율(0~1) → 퍼센트 문자열. null이면 '—'. */
export function formatPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${Math.round(rate * 100)}%`;
}

/** 원화 표기. */
export function formatKrw(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`;
}

/** 퍼널 단계별 전환율(가입→구독, 구독→발송). AC-GR-1 획득 퍼널. */
export function funnelRates(f: GrowthFunnel): {
  subscribeRate: number | null;
  deliverRate: number | null;
} {
  return {
    subscribeRate: f.signedUp > 0 ? f.subscribed / f.signedUp : null,
    deliverRate: f.subscribed > 0 ? f.delivered / f.subscribed : null,
  };
}
