'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 현재 로그인한 사용자의 계정과 데이터를 삭제한다 (SSR REQ-A3).
 * auth.users 삭제 → FK on delete cascade 로 profiles/user_settings/
 * subscriptions/deliveries 가 연쇄 삭제된다 (AC-A3.1). 삭제 후 로그인 화면으로.
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(`계정 삭제 실패: ${error.message}`);
  }

  // 로컬 세션 쿠키 정리 후 로그인으로 이동.
  await supabase.auth.signOut();
  redirect('/login');
}
