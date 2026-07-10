import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import CreditLedgerCard from '@/components/settings/CreditLedgerCard';
import ReferralStatusCard from '@/components/settings/ReferralStatusCard';
import ReferralTabs from '@/components/settings/ReferralTabs';
import {
  getOrCreateReferralCode,
  getCreditLedger,
  getReferralProgress,
} from '@/lib/referral/queries';
import { referralLink } from '@/lib/referral/code';

/** 친구 초대 & 크레딧 (REQ-G). 홈 배너/기존 진입점에서 이 화면으로 모은다. */
export default async function ReferralPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  // 공유 링크는 요청 오리진에서 절대 URL로 구성(APP_BASE_URL 미설정 환경에서도 동작).
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : (process.env.APP_BASE_URL ?? '');

  const [referralCode, ledger, referralProgress] = await Promise.all([
    getOrCreateReferralCode(supabase, user.id),
    getCreditLedger(supabase, user.id),
    getReferralProgress(supabase),
  ]);
  const referralHref = referralLink(referralCode, baseUrl);
  const inviteCount = referralProgress.filter((r) => r.status !== 'void').length; // 초대한 친구 수
  const grantCount = ledger.grantCount; // 지급받은 크레딧 건수

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">친구 초대 &amp; 크레딧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            친구를 초대해 크레딧을 모으고, 내 크레딧 내역을 확인하세요.
          </p>
        </header>

        {/* 좌: 친구 초대(기본), 우: 내 크레딧 — 탭 카드로 분리 */}
        <ReferralTabs
          inviteCount={inviteCount}
          grantCount={grantCount}
          invite={<ReferralStatusCard link={referralHref} rows={referralProgress} />}
          credit={<CreditLedgerCard ledger={ledger} />}
        />
      </main>
    </div>
  );
}
