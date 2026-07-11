import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import ReferralShareButton from '@/components/settings/ReferralShareButton';
import ReferralStatusCard from '@/components/settings/ReferralStatusCard';
import { getOrCreateReferralCode, getReferralProgress } from '@/lib/referral/queries';
import { referralLink } from '@/lib/referral/code';
import { ACTIVATION_MIN_CHANNELS, ACTIVATION_MIN_SUMMARIES } from '@/lib/referral/constants';

/** 친구 초대 (REQ-G). 초대하기 카드 + 초대한 내역 카드. 크레딧은 /credits 로 분리. */
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

  const [referralCode, referralProgress] = await Promise.all([
    getOrCreateReferralCode(supabase, user.id),
    getReferralProgress(supabase),
  ]);
  const referralHref = referralLink(referralCode, baseUrl);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">친구 초대</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            친구를 초대해 함께 크레딧을 받아보세요.
          </p>
        </header>

        {/* 초대하기 카드 */}
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">초대하기</h2>
          <ReferralShareButton link={referralHref} />
          <p className="mt-3 text-xs text-muted-foreground">
            친구가{' '}
            <span className="font-medium text-foreground">
              이 링크로 가입해 채널 {ACTIVATION_MIN_CHANNELS}개 구독 + 다이제스트 {ACTIVATION_MIN_SUMMARIES}개
            </span>
            를 받으면, 친구와 나 모두 <span className="font-medium text-foreground">크레딧 2,000원</span>을
            받아요.
          </p>
        </Card>

        {/* 초대한 내역 카드 */}
        <Card className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-semibold">초대한 내역</h2>
          <ReferralStatusCard rows={referralProgress} />
        </Card>
      </main>
    </div>
  );
}
