import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { linkReferralOnSignup } from '@/lib/referral/link';
import { REFERRAL_COOKIE } from '@/lib/referral/cookie';

/**
 * 로그인 직후 추천 귀속 지점 (REQ-B). OAuth·이메일 OTP 두 경로 모두 여기로 모여서
 * gk_ref 쿠키가 있으면 관계를 만든다(콜백 route 만으론 OTP 경로가 커버되지 않던 버그 수정).
 * 세션이 이미 선 상태에서 호출되므로 getUser 로 사용자를 읽고, 처리 후 목적지로 보낸다.
 */
// 신규 가입 판정 여유(로그인 직후 수초 내 호출되므로 넉넉히). 기존 회원 로그인엔 추천을 붙이지 않음(AC-B1.2).
const NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';
  const res = NextResponse.redirect(`${origin}${next}`);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);

    const store = await cookies();
    const refCode = store.get(REFERRAL_COOKIE)?.value ?? null;
    if (!refCode) return res;

    // 코드는 한 번 소비하면 제거(성공/실패 무관).
    res.cookies.delete(REFERRAL_COOKIE);

    const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0;
    const isFreshSignup = createdMs > 0 && Date.now() - createdMs < NEW_ACCOUNT_WINDOW_MS;
    if (!isFreshSignup) return res; // 기존 회원 로그인엔 새 추천을 붙이지 않음

    const admin = createAdminClient();
    await linkReferralOnSignup(admin, {
      refereeUserId: user.id,
      refereeEmail: user.email ?? null,
      code: refCode,
    });
  } catch (e) {
    console.warn(`[referral] 가입 귀속 실패: ${(e as Error).message}`);
  }

  return res;
}
