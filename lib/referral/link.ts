import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { normalizedEmailHash } from './email-hash';
import { isValidReferralCode } from './code';
import { isSelfReferral } from './abuse';

/**
 * 가입 완료 시 추천 관계를 생성한다 (REQ-B). 서비스 롤 클라이언트로 호출(RLS 우회, 서버 전용).
 * 정규화 이메일 해시로 abuse_guard 행을 확보하고(AC-I1.1), 코드→추천인 해석 후
 * 자기추천(AC-B1.3/I1.4)·재귀속(AC-B1.2)을 막고 referrals(pending) 1건을 만든다.
 * 지급은 활성화 시점(activate_and_award)으로 분리된다.
 */
type Admin = SupabaseClient<Database>;

export type LinkResult =
  | { linked: true; referrerUserId: string; referralId: string }
  | {
      linked: false;
      reason: 'no_code' | 'invalid_code' | 'unknown_code' | 'self' | 'already';
    };

export async function linkReferralOnSignup(
  admin: Admin,
  params: { refereeUserId: string; refereeEmail: string | null; code: string | null },
): Promise<LinkResult> {
  const { refereeUserId, refereeEmail, code } = params;

  // 이메일 해시로 abuse_guard 행 확보(없으면 생성; 기존 rewarded_before 는 유지). 원문 미저장(AC-I1.1).
  const emailHash = refereeEmail ? normalizedEmailHash(refereeEmail) : null;
  if (emailHash) {
    await admin
      .from('abuse_guard')
      .upsert({ email_hash: emailHash }, { onConflict: 'email_hash', ignoreDuplicates: true });
  }

  if (!code) return { linked: false, reason: 'no_code' };
  if (!isValidReferralCode(code)) return { linked: false, reason: 'invalid_code' };

  const { data: codeRow } = await admin
    .from('referral_codes')
    .select('user_id')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!codeRow) return { linked: false, reason: 'unknown_code' };
  const referrerUserId = codeRow.user_id;

  // 자기추천 차단(AC-B1.3/I1.4). DB CHECK(referrer<>referee)도 최종 방어.
  if (isSelfReferral(referrerUserId, refereeUserId)) return { linked: false, reason: 'self' };

  // 이미 귀속된 피추천인은 재귀속하지 않음(AC-B1.2). unique(referee)가 경합의 최종 방어.
  const { data: existing } = await admin
    .from('referrals')
    .select('id')
    .eq('referee_user_id', refereeUserId)
    .maybeSingle();
  if (existing) return { linked: false, reason: 'already' };

  const { data: inserted, error } = await admin
    .from('referrals')
    .insert({
      referrer_user_id: referrerUserId,
      referee_user_id: refereeUserId,
      code: code.toUpperCase(),
      referee_email_hash: emailHash,
      status: 'pending',
    })
    .select('id')
    .maybeSingle();
  if (error || !inserted) return { linked: false, reason: 'already' };

  return { linked: true, referrerUserId, referralId: inserted.id };
}
