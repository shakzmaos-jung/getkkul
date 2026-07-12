import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Google OAuth 콜백 — code 를 세션으로 교환하고 관제 홈으로. 인가(admin_users)는 proxy 가 집행.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/overview';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
