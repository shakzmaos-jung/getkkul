import { PLANS, type PlanCode } from './plans';

/** 프로필 카드 플랜 배지 텍스트. 순수 함수(클라이언트·서버 공용). 멤버십 없으면 우아한 폴백('무료'). */
export function planBadgeText(
  m: { plan_code?: string | null; status?: string | null; poc_free_until?: string | null } | null,
  now: Date = new Date(),
): string {
  if (!m || !m.plan_code) return '무료';
  const name = PLANS[m.plan_code as PlanCode]?.name ?? '';
  const pocActive =
    m.status === 'poc_free' && !!m.poc_free_until && now < new Date(m.poc_free_until);
  if (pocActive) return name ? `얼리버드 무료 · ${name}` : '얼리버드 무료';
  return name || '무료';
}
