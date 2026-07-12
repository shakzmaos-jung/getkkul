/**
 * 멤버십 플랜 정의 (membership-spec §1). 요금은 KRW(=크레딧 1:1). 한도는 주기당.
 * 플랜은 상수로 관리(설정 테이블 대체) — 공용 읽기, 변경은 배포로.
 */

export type PlanCode = 'free' | 'small' | 'medium' | 'large';

export interface Plan {
  code: PlanCode;
  name: string;
  price: number; // 월 요금(원). 크레딧 1:1.
  channelLimit: number; // 구독 채널 수
  digestLimit: number; // 다이제스트/월
  aiQueryLimit: number; // AI 질의/월
}

export const PLANS: Record<PlanCode, Plan> = {
  free: { code: 'free', name: 'Free', price: 0, channelLimit: 5, digestLimit: 30, aiQueryLimit: 10 },
  small: { code: 'small', name: 'Small', price: 1000, channelLimit: 10, digestLimit: 100, aiQueryLimit: 30 },
  medium: { code: 'medium', name: 'Medium', price: 2000, channelLimit: 20, digestLimit: 500, aiQueryLimit: 50 },
  large: { code: 'large', name: 'Large', price: 3000, channelLimit: 30, digestLimit: 1000, aiQueryLimit: 100 },
};

/** 낮은→높은 등급 순서(업/다운그레이드 판정용). */
export const PLAN_ORDER: PlanCode[] = ['free', 'small', 'medium', 'large'];

export function planRank(code: PlanCode): number {
  return PLAN_ORDER.indexOf(code);
}

/** a 가 b 보다 상위 등급인가(업그레이드). */
export function isUpgrade(from: PlanCode, to: PlanCode): boolean {
  return planRank(to) > planRank(from);
}

export function isDowngrade(from: PlanCode, to: PlanCode): boolean {
  return planRank(to) < planRank(from);
}

export function getPlan(code: PlanCode): Plan {
  return PLANS[code];
}

export function isPlanCode(v: unknown): v is PlanCode {
  return typeof v === 'string' && (PLAN_ORDER as string[]).includes(v);
}
