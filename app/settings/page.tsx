import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import LengthModeForm from '@/components/settings/LengthModeForm';
import DeliveryEmailForm from '@/components/settings/DeliveryEmailForm';
import SignOutButton from '@/components/auth/SignOutButton';
import DeleteAccountButton from '@/components/auth/DeleteAccountButton';
import type { LengthMode } from '@/lib/summary/format';

/** 설정 (요약 길이 / 수신 이메일). */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: setting } = await supabase
    .from('user_settings')
    .select('summary_length, delivery_email')
    .eq('user_id', user.id)
    .maybeSingle();
  const current = (setting?.summary_length ?? 'normal') as LengthMode;
  const deliveryEmail = setting?.delivery_email ?? user.email ?? '';
  const isDefaultEmail = !setting?.delivery_email;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
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
    </div>
  );
}
