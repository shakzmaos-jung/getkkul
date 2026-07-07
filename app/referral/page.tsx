import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { Card } from '@/components/ui/Card';
import CreditLedgerCard from '@/components/settings/CreditLedgerCard';
import ReferralStatusCard from '@/components/settings/ReferralStatusCard';
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

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">내 크레딧</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              적립·사용·만료 내역과 사용 가능한 잔액입니다.
            </p>
            <CreditLedgerCard ledger={ledger} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">친구 초대</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              링크로 친구를 초대하고, 친구가 활성화하면 둘 다 크레딧을 받아요.
            </p>
            <ReferralStatusCard link={referralHref} rows={referralProgress} />
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
