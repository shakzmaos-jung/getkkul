import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isAdmin, type AdminMembership } from '@/lib/auth/access';

/** service_role fetch 계층 인가 실패를 나타내는 오류. */
export class AdminAuthError extends Error {
  constructor(message = '관리자 권한이 필요합니다.') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

/**
 * service_role 데이터 fetch 계층에서 호출하는 **심층 방어(defense-in-depth) 인가 게이트**.
 *
 * 인가는 1차로 proxy 미들웨어(REQ-AU-2)가 담당하지만, Next 미들웨어 우회 취약점
 * (예: CVE-2025-29927)처럼 미들웨어가 무력화되는 상황에서도 service_role 로 읽는
 * 구독자 PII·운영 데이터가 노출되지 않도록, **데이터를 조회하기 직전** 다시 검증한다.
 *
 * 판정 근거는 **본인 세션 + admin_users self-read(RLS: user_id = auth.uid())** 뿐이다
 * — service_role 을 쓰지 않으므로(anon 세션 클라이언트) 타인 행을 볼 수 없고,
 * 클라이언트가 넣은 어떤 식별자도 신뢰하지 않는다(IDOR 방지).
 *
 * 비관리자·미인증이면 {@link AdminAuthError} 를 던진다 → 페이지는 데이터 없이 오류를 렌더.
 */
export async function requireAdmin(): Promise<AdminMembership> {
  const supabase = await createClient();

  // 세션 주체 확인(비대칭 키면 로컬 검증, 실패 시 getUser 폴백 — session.ts 패턴 준용).
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    userId = typeof sub === 'string' ? sub : null;
  } catch {
    userId = null;
  }
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) throw new AdminAuthError('로그인이 필요합니다.');

  // admin_users 본인 행(RLS self-read). 없으면 비관리자.
  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  const membership: AdminMembership = data ? { role: data.role } : null;
  if (!isAdmin(membership)) throw new AdminAuthError();
  return membership;
}
