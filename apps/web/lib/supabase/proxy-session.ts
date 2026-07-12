import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';
import { shouldRedirectToLogin } from '@/lib/supabase/route-access';

/**
 * 요청마다 Supabase 세션을 갱신하고, 미인증 사용자의 보호 경로 접근을 /login 으로 보낸다
 * (SSR AC-A1.1). Next.js 16 proxy(구 middleware)에서 호출된다.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 인증 확인은 getClaims 로 — 프로젝트가 비대칭 키(ES256)라 JWT 서명을 로컬 검증한다
  // (JWKS 캐시, 네트워크 왕복 없음 → 메뉴 이동마다 있던 Auth 서버 왕복 제거, plan F2).
  // 토큰 만료·검증 실패 시에만 getUser 폴백(리프레시 토큰으로 세션 갱신 경로 보존).
  let hasUser = false;
  try {
    const { data } = await supabase.auth.getClaims();
    hasUser = Boolean(data?.claims?.sub);
  } catch {
    hasUser = false;
  }
  if (!hasUser) {
    const {
      data: { user },
    } = await supabase.auth.getUser(); // 만료 토큰 리프레시 시도(쿠키 갱신은 setAll 로 전파)
    hasUser = Boolean(user);
  }

  if (shouldRedirectToLogin(hasUser, request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
