import { pointsToText, type LengthMode } from '@/lib/summary/format';
import type { ModeSummary } from '@/lib/feed/map-digests';

/**
 * 다이제스트 카드 탭(정보 성격) — 저장 enum(short/normal/long)과 디커플.
 * 간단히=short.points / 자세히=long.facts / 인사이트=long.insights.
 */
export type CardView = 'simple' | 'detail' | 'insight';

export const CARD_VIEWS: readonly CardView[] = ['simple', 'detail', 'insight'];

/** 뷰 → 저장/피드백용 enum(자세히·인사이트는 둘 다 long 요약에서 파생). */
export const VIEW_ENUM: Record<CardView, LengthMode> = {
  simple: 'short',
  detail: 'long',
  insight: 'long',
};

/** pref/global enum → 초기 뷰(short→간단히, normal/long→자세히). */
export function enumToView(m: LengthMode): CardView {
  return m === 'short' ? 'simple' : 'detail';
}

/** 뷰별 표시 불릿 + 정본 텍스트(읽는시간·복사용). */
export function viewContent(
  summaries: Partial<Record<LengthMode, ModeSummary>>,
  view: CardView,
): { bullets: string[]; text: string } {
  if (view === 'simple') {
    const s = summaries.short;
    if (!s || s.notProvided) return { bullets: [], text: '' };
    const b = s.points ?? [];
    return { bullets: b, text: b.length ? pointsToText(b) : s.coreText };
  }
  const lm = summaries.long;
  const body = lm && !lm.notProvided ? lm.long : undefined;
  const arr = !body ? [] : view === 'detail' ? body.facts : body.insights;
  return { bullets: arr, text: pointsToText(arr) };
}

/** 해당 뷰가 표시할 내용이 있는가. */
export function viewAvailable(
  summaries: Partial<Record<LengthMode, ModeSummary>>,
  view: CardView,
): boolean {
  const c = viewContent(summaries, view);
  return c.bullets.length > 0 || c.text.trim().length > 0;
}

/** 초기 뷰 결정: 선호 뷰가 가용하면 그것, 아니면 첫 가용 뷰(간단히는 사실상 항상 가용). */
export function resolveInitialView(
  summaries: Partial<Record<LengthMode, ModeSummary>>,
  initialMode: LengthMode,
): CardView {
  const pref = enumToView(initialMode);
  if (viewAvailable(summaries, pref)) return pref;
  return CARD_VIEWS.find((v) => viewAvailable(summaries, v)) ?? 'simple';
}
