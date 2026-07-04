import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Google OAuth 콜백 (SSR REQ-A1). Supabase 가 code 를 붙여 리디렉션하면
 * 세션으로 교환하고 목적지로 보낸다. 최초 로그인 시 profiles/user_settings 는
 * DB 트리거(handle_new_user)가 생성한다 (AC-A1.2).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
