import { NextResponse } from 'next/server';
import { isValidReferralCode } from '@/lib/referral/code';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/referral/cookie';

/**
 * 추천 링크 진입점 (REQ-A2/B1). /r/{code} 방문 시 코드를 쿠키에 저장하고 홈으로 보낸다.
 * 실제 귀속(referrals 생성)은 가입 완료 시점(auth/callback)에서 수행한다(AC-B1.1).
 * 공개 경로이므로 미인증 방문자도 접근 가능(route-access PUBLIC_PATH_PREFIXES '/r').
 */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { origin } = new URL(request.url);
  const res = NextResponse.redirect(`${origin}/`);

  // 형식이 맞는 코드만 저장(오염 방지). 유효성/자기추천/중복은 가입 시 최종 판정.
  if (code && isValidReferralCode(code)) {
    res.cookies.set(REFERRAL_COOKIE, code.toUpperCase(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: '/',
    });
  }
  return res;
}
