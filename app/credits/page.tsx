import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import CreditLedgerCard from '@/components/settings/CreditLedgerCard';
import { getCreditLedger } from '@/lib/referral/queries';

export const metadata = { title: '크레딧' };

/** 크레딧 (REQ-G). 총 획득/사용/잔여 + 적립·사용 내역(→ 친구 초대 / 결제 내역 이동). */
export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const ledger = await getCreditLedger(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">크레딧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            적립·사용 내역과 잔여 크레딧을 확인하세요.
          </p>
        </header>

        <Card className="p-5">
          <CreditLedgerCard ledger={ledger} />
        </Card>
      </main>
    </div>
  );
}
