import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { Card } from '@/components/ui/Card';
import LengthModeForm from '@/components/settings/LengthModeForm';
import DeliveryEmailForm from '@/components/settings/DeliveryEmailForm';
import DeliverySlotsForm from '@/components/settings/DeliverySlotsForm';
import VideoDurationFilterForm from '@/components/settings/VideoDurationFilterForm';
import PushSettings from '@/components/settings/PushSettings';
import SkipEmptyForm from '@/components/settings/SkipEmptyForm';
import SignOutButton from '@/components/auth/SignOutButton';
import DeleteAccountButton from '@/components/auth/DeleteAccountButton';
import CreditLedgerCard from '@/components/settings/CreditLedgerCard';
import ReferralStatusCard from '@/components/settings/ReferralStatusCard';
import type { LengthMode } from '@/lib/summary/format';
import { SLOT_CODES, type SlotCode } from '@/lib/time';
import {
  getOrCreateReferralCode,
  getCreditLedger,
  getReferralProgress,
} from '@/lib/referral/queries';
import { referralLink } from '@/lib/referral/code';

/** 설정 (요약 길이 / 수신 이메일 / 발송 시각). */
export default async function SettingsPage() {
  const supabase = await createClient();
  // proxy 가 이미 세션을 검증했으므로 getSession(네트워크 없음)으로 사용자 정보만 읽는다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const { data: setting } = await supabase
    .from('user_settings')
    .select(
      'summary_length, delivery_email, delivery_slots, exclude_over_2h, push_slot_0730, push_slot_1130, push_slot_1730, skip_empty_push, skip_empty_email',
    )
    .eq('user_id', user.id)
    .maybeSingle();
  const current = (setting?.summary_length ?? 'normal') as LengthMode;
  const deliveryEmail = setting?.delivery_email ?? user.email ?? '';
  const isDefaultEmail = !setting?.delivery_email;
  const deliverySlots = (setting?.delivery_slots ?? SLOT_CODES) as SlotCode[];
  const excludeOver2h = setting?.exclude_over_2h ?? true;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  const pushSlots = {
    s0730: setting?.push_slot_0730 ?? false,
    s1130: setting?.push_slot_1130 ?? false,
    s1730: setting?.push_slot_1730 ?? false,
  };
  const skip = {
    push: setting?.skip_empty_push ?? true,
    email: setting?.skip_empty_email ?? true,
  };

  // 친구추천 & 크레딧 (REQ-G). 코드/원장/진행률을 병렬 로드(RLS 본인 스코프).
  const baseUrl = process.env.APP_BASE_URL ?? '';
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
          <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        </header>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">친구 초대</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              링크로 친구를 초대하고, 친구가 활성화하면 둘 다 크레딧을 받아요.
            </p>
            <ReferralStatusCard link={referralHref} rows={referralProgress} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">내 크레딧</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              적립·사용·만료 내역과 사용 가능한 잔액입니다.
            </p>
            <CreditLedgerCard ledger={ledger} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">요약 길이</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              다이제스트 카드에 보여줄 요약 분량을 정합니다.
            </p>
            <LengthModeForm current={current} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">이메일 알림</h2>
            <p className="mb-3 text-xs text-muted-foreground">선택한 시간에만 이메일을 받습니다.</p>
            <DeliverySlotsForm current={deliverySlots} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">푸시 알림</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              앱 설치 후 모바일 푸시로 다이제스트를 받습니다. 슬롯별로 켜고 끌 수 있어요.
            </p>
            {vapidPublicKey ? (
              <PushSettings vapidPublicKey={vapidPublicKey} pushSlots={pushSlots} />
            ) : (
              <p className="text-xs text-muted-foreground">
                푸시 알림 준비 중입니다(서버 키 등록 후 활성화).
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">새 소식 없을 때</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              담을 새 영상이 없는 시간대의 발송을 생략할지 정합니다.
            </p>
            <SkipEmptyForm skip={skip} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">영상 길이 필터</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              너무 짧거나 긴 영상을 다이제스트에서 제외합니다.
            </p>
            <VideoDurationFilterForm excludeOver2h={excludeOver2h} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-sm font-semibold">수신 이메일</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              다이제스트를 받을 이메일 주소입니다. 미설정 시 로그인 이메일로 발송됩니다.
            </p>
            <DeliveryEmailForm current={deliveryEmail} isDefault={isDefaultEmail} />
          </Card>
        </div>

        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-6">
          <SignOutButton />
          <DeleteAccountButton />
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
