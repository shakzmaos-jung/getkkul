import type { NextRequest } from 'next/server';
import { updateAdminSession } from '@/lib/supabase/session';

// Next.js 16: middleware → proxy. 루트 위치, Node.js 런타임 기본.
// 모든 어드민 경로에서 세션 갱신 + admin_users 이중 검증(REQ-AU-2).
export async function proxy(request: NextRequest) {
  return updateAdminSession(request);
}

export const config = {
  matcher: [
    // 정적 자산·이미지·favicon 제외 전 경로에서 인가 실행.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
