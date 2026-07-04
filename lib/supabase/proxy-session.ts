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

  // 중요: createServerClient 직후 곧바로 getUser 를 호출한다(사이에 로직 금지).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (shouldRedirectToLogin(Boolean(user), request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
