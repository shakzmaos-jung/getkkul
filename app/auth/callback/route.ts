import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Google OAuth 콜백 (SSR REQ-A1). code 를 세션으로 교환하고, 추천 귀속을 처리하는
 * /auth/claim 으로 보낸다(귀속은 OAuth·OTP 공용 지점에서 일괄 처리, REQ-B).
 * 최초 로그인 시 profiles/user_settings 는 DB 트리거가 생성한다 (AC-A1.2).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/claim?next=${encodeURIComponent(next)}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
