'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 현재 로그인한 사용자의 계정과 데이터를 삭제한다 (SSR REQ-A3, 친구추천 REQ-J).
 * 삭제 전에 본인 보유 크레딧을 소멸 처리하고(forfeit 트랜잭션, AC-J1.1),
 * auth.users 삭제 → FK cascade 로 profiles/settings/subscriptions/deliveries/
 * 본인 credit_grants/referrals(referee)가 연쇄 삭제된다. 어뷰징 방지용 abuse_guard 는
 * profiles FK 가 없어 보존되고(AC-J1.2), 추천인 측 크레딧은 source_referral_id SET NULL 로 유지된다(AC-J1.3).
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

  // 본인 크레딧 즉시 소멸(원자 함수). 실패해도 삭제는 진행(계정 데이터는 어차피 cascade 소멸).
  const { error: forfeitErr } = await admin.rpc('forfeit_user_credits', { p_user: user.id });
  if (forfeitErr) {
    console.warn(`[account] 크레딧 소멸 실패(삭제는 계속): ${forfeitErr.message}`);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(`계정 삭제 실패: ${error.message}`);
  }

  // 로컬 세션 쿠키 정리 후 로그인으로 이동.
  await supabase.auth.signOut();
  redirect('/login');
}
