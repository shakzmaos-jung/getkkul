import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { linkReferralOnSignup } from '@/lib/referral/link';
import { REFERRAL_COOKIE } from '@/lib/referral/cookie';

/**
 * Google OAuth 콜백 (SSR REQ-A1). code 를 세션으로 교환하고 목적지로 보낸다.
 * 최초 로그인 시 profiles/user_settings 는 DB 트리거가 생성한다 (AC-A1.2).
 * 추천 코드 쿠키가 있고 "방금 만든 계정"이면 추천 관계를 귀속한다 (REQ-B, AC-B1.1/B1.2).
 */

// 신규 가입 판정 여유. 이 시간 안에 생성된 계정만 추천 귀속(기존 회원 로그인 제외, AC-B1.2).
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      await maybeLinkReferral(data.user, res);
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

/** 추천 쿠키가 있으면 신규 가입에 한해 관계를 귀속하고 쿠키를 정리한다. 실패해도 로그인은 진행. */
async function maybeLinkReferral(user: User | null, res: NextResponse): Promise<void> {
  try {
    if (!user) return;
    const store = await cookies();
    const refCode = store.get(REFERRAL_COOKIE)?.value ?? null;
    if (!refCode) return;

    // 코드는 한 번 소비하면 제거(성공/실패 무관, 오래 남겨두지 않음).
    res.cookies.delete(REFERRAL_COOKIE);

    const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0;
    const isFreshSignup = createdMs > 0 && Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS;
    if (!isFreshSignup) return; // 기존 회원 로그인엔 새 추천을 붙이지 않음

    const admin = createAdminClient();
    await linkReferralOnSignup(admin, {
      refereeUserId: user.id,
      refereeEmail: user.email ?? null,
      code: refCode,
    });
  } catch (e) {
    console.warn(`[referral] 가입 귀속 실패: ${(e as Error).message}`);
  }
}
