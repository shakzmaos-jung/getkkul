// 어드민 인가 — 순수 로직 (SSR §B, REQ-AU-2). Next/DB 비의존 → 완전 단위 테스트 대상.
// 핵심: 접근 판정은 **서버가 확인한 세션 + admin_users 소속**만으로 내린다.
// URL의 리소스 ID 등 클라이언트 입력은 판정에 절대 사용하지 않는다(IDOR 방지, AC-AU-2b).
import type { AdminRole } from '@/lib/database.types';

export type AdminMembership = { role: AdminRole } | null;

/** 역할 랭크: master ⊇ sub_master. */
const ROLE_RANK: Record<AdminRole, number> = { sub_master: 1, master: 2 };

export const LOGIN_PATH = '/login';

/** 로그인 없이 접근 가능한 어드민 경로(로그인·OAuth 콜백). */
export const ADMIN_PUBLIC_PREFIXES = ['/login', '/auth'] as const;

export function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isValidRole(role: string | null | undefined): role is AdminRole {
  return role === 'master' || role === 'sub_master';
}

export function isAdmin(membership: AdminMembership): boolean {
  return membership != null && isValidRole(membership.role);
}

/** membership 의 역할이 required 이상인지(master 는 sub_master 권한 포함). */
export function hasRole(
  membership: AdminMembership,
  required: AdminRole,
): boolean {
  if (!isAdmin(membership)) return false;
  return ROLE_RANK[membership!.role] >= ROLE_RANK[required];
}

export type AdminAccessInput = {
  hasSession: boolean;
  membership: AdminMembership;
  pathname: string;
  /** 해당 경로가 요구하는 최소 역할(예: 초대/수동실행은 'master'). 없으면 admin 이면 충분. */
  requiredRole?: AdminRole;
};

export type AdminAccessDecision =
  | { allow: true; reason: 'public' | 'authorized' }
  | { allow: false; reason: 'no-session' | 'not-admin'; redirectTo: string }
  | { allow: false; reason: 'insufficient-role'; status: 403 };

/**
 * 어드민 접근 판정(서버사이드 이중 검증). 판정 근거는 hasSession + membership + pathname 뿐 —
 * 클라이언트가 URL/파라미터로 넣은 어떤 식별자도 신뢰하지 않는다.
 */
export function resolveAdminAccess(
  input: AdminAccessInput,
): AdminAccessDecision {
  if (isAdminPublicPath(input.pathname)) {
    return { allow: true, reason: 'public' };
  }
  if (!input.hasSession) {
    return { allow: false, reason: 'no-session', redirectTo: LOGIN_PATH };
  }
  if (!isAdmin(input.membership)) {
    return { allow: false, reason: 'not-admin', redirectTo: LOGIN_PATH };
  }
  if (input.requiredRole && !hasRole(input.membership, input.requiredRole)) {
    return { allow: false, reason: 'insufficient-role', status: 403 };
  }
  return { allow: true, reason: 'authorized' };
}
