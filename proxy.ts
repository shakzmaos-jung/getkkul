import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy-session';

// Next.js 16: middleware → proxy 로 개명됨. 루트에 위치, Node.js 런타임 기본.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 정적 자산·이미지·favicon 을 제외한 모든 경로에서 세션 갱신 + 인증 가드 실행.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
