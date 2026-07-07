import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { Card } from '@/components/ui/Card';
import LengthModeForm from '@/components/settings/LengthModeForm';
import DeliveryEmailForm from '@/components/settings/DeliveryEmailForm';
import DeliverySlotsForm from '@/components/settings/DeliverySlotsForm';
import SignOutButton from '@/components/auth/SignOutButton';
import DeleteAccountButton from '@/components/auth/DeleteAccountButton';
import type { LengthMode } from '@/lib/summary/format';
import { SLOT_CODES, type SlotCode } from '@/lib/time';

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
    .select('summary_length, delivery_email, delivery_slots')
    .eq('user_id', user.id)
    .maybeSingle();
  const current = (setting?.summary_length ?? 'normal') as LengthMode;
  const deliveryEmail = setting?.delivery_email ?? user.email ?? '';
  const isDefaultEmail = !setting?.delivery_email;
  const deliverySlots = (setting?.delivery_slots ?? SLOT_CODES) as SlotCode[];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        </header>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold">요약 길이</h2>
            <LengthModeForm current={current} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold">수신 이메일</h2>
            <DeliveryEmailForm current={deliveryEmail} isDefault={isDefaultEmail} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold">발송 시각</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              하루 3회(07:30 / 11:30 / 17:30) 중 받을 시각을 고르세요.
            </p>
            <DeliverySlotsForm current={deliverySlots} />
          </Card>
        </div>

        <section className="mt-12 border-t border-border pt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            계정
          </h2>
          <div className="mt-2 flex flex-col items-start">
            <SignOutButton />
            <DeleteAccountButton />
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
