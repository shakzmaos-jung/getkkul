import { pointsToText, type LengthMode } from '@/lib/summary/format';
import type { ModeSummary } from '@/lib/feed/map-digests';

/**
 * 다이제스트 카드 탭 = 상세도 스펙트럼. 내부 length_mode 3종에 1:1 매핑한다.
 * 간단히(simple)=short · 자세히(detail)=normal · 최대한(full)=long(facts+insights 결합).
 * 셋이 서로 다른 모드라 선호(user_video_prefs)·피드백(content_feedback)이 탭별로 구분 저장된다.
 */
export type CardView = 'simple' | 'detail' | 'full';

export const CARD_VIEWS: readonly CardView[] = ['simple', 'detail', 'full'];

/** 뷰 → 저장/피드백용 length_mode(1:1). */
export const VIEW_ENUM: Record<CardView, LengthMode> = {
  simple: 'short',
  detail: 'normal',
  full: 'long',
};

/** length_mode → 뷰(1:1). */
export function enumToView(m: LengthMode): CardView {
  return m === 'short' ? 'simple' : m === 'normal' ? 'detail' : 'full';
}

/** 뷰별 표시 불릿 + 정본 텍스트(읽는시간·복사용). */
export function viewContent(
  summaries: Partial<Record<LengthMode, ModeSummary>>,
  view: CardView,
): { bullets: string[]; text: string } {
  if (view === 'full') {
    // 최대한 = long 요약: facts + insights 를 이어 붙여 가장 상세하게. (구버전 데이터도 동일 구조)
    const lm = summaries.long;
    if (!lm || lm.notProvided) return { bullets: [], text: '' };
    const body = lm.long;
    const arr = body ? [...(body.facts ?? []), ...(body.insights ?? [])] : (lm.points ?? []);
    return { bullets: arr, text: arr.length ? pointsToText(arr) : lm.coreText };
  }
  const s = view === 'simple' ? summaries.short : summaries.normal;
  if (!s || s.notProvided) return { bullets: [], text: '' };
  const b = s.points ?? [];
  return { bullets: b, text: b.length ? pointsToText(b) : s.coreText };
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
