import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { resolveAdminAccess, type AdminMembership } from '@/lib/auth/access';

/**
 * 요청마다 Supabase 세션을 갱신하고 어드민 인가를 서버사이드로 이중 검증한다
 * (SSR REQ-AU-2). 미인증·비-admin·권한부족을 각각 차단한다.
 *
 * admin_users 소속은 **본인 세션**으로 조회한다 — RLS self-read 정책(user_id = auth.uid())이
 * 본인 행만 허용하므로 service_role 없이 안전하다(미들웨어에 service_role 미보유, ADR-A2).
 */
export async function updateAdminSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 주체 확인(비대칭 키면 로컬 검증, 만료 시 getUser 폴백 — web 패턴 준용).
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

  // admin_users 자기 행(RLS self-read).
  let membership: AdminMembership = null;
  if (userId) {
    const { data } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) membership = { role: data.role };
  }

  const decision = resolveAdminAccess({
    hasSession: Boolean(userId),
    membership,
    pathname: request.nextUrl.pathname,
  });

  if (!decision.allow && 'redirectTo' in decision) {
    const url = request.nextUrl.clone();
    url.pathname = decision.redirectTo;
    return NextResponse.redirect(url);
  }
  if (!decision.allow && 'status' in decision) {
    return new NextResponse('Forbidden', { status: decision.status });
  }
  return response;
}
