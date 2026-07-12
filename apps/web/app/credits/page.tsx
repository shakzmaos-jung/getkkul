import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import CreditLedgerCard from '@/components/settings/CreditLedgerCard';
import { getCreditLedger, getReferralProgress } from '@/lib/referral/queries';

export const metadata = { title: '크레딧' };

/** 크레딧 (REQ-G). 총 획득/사용/잔여 + 적립·사용 내역(적립 → 친구 정보(마스킹), 사용 → 결제 내역). */
export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  // 원장 + 초대 진행(referral_id → referee_email, DEFINER 로 email 노출)을 병렬 로드.
  const [ledger, progress] = await Promise.all([
    getCreditLedger(supabase, user.id),
    getReferralProgress(supabase),
  ]);
  // 적립(grant) 내역의 sourceReferralId → 피추천인 이메일 매핑(카드에서 마스킹).
  const referralEmails: Record<string, string | null> = {};
  for (const r of progress) referralEmails[r.referral_id] = r.referee_email;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {/* 타이틀·설명은 상단 헤더 + 가이드 배지로 */}
        <CreditLedgerCard ledger={ledger} referralEmails={referralEmails} />
      </main>
    </div>
  );
}
