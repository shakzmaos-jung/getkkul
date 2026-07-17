import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AppHeader from '@/components/layout/AppHeader';
import MembershipScreen from '@/components/membership/MembershipScreen';
import { getMembershipView } from '@/lib/membership/view';
import { buildBillingCards } from '@/lib/membership/history';
import { formatKst } from '@/lib/time';
import { timed } from '@/lib/perf';

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const admin = createAdminClient();
  // view 조립과 결제내역을 병렬로(직렬 왕복 제거).
  const [view, { data: history }] = await timed('/membership', () =>
    Promise.all([
      getMembershipView(user.id),
      admin
        .from('billing_history')
        .select('billing_period, plan_code, amount, credit_used, status, created_at, memo')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]),
  );

  const billingRows = (history ?? []).map((h) => ({
    period: h.billing_period,
    planCode: h.plan_code,
    amount: h.amount,
    creditUsed: h.credit_used,
    status: h.status,
    at: h.created_at, // ISO — buildBillingCards 가 정렬·표시용으로 사용
    memo: h.memo,
  }));
  const billingCards = buildBillingCards(billingRows, {
    currentPeriodStart: view.periodStart,
    currentPeriodEnd: view.periodEnd,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <MembershipScreen
          view={view}
          nextBillingText={formatKst(view.nextBillingAt)}
          pocUntilText={view.pocFreeUntil ? formatKst(view.pocFreeUntil) : null}
          graceUntilText={view.graceUntil ? formatKst(view.graceUntil) : null}
          billingCards={billingCards}
        />
      </main>
    </div>
  );
}
