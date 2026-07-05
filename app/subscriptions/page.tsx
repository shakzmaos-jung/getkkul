import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import AddSubscriptionForm from '@/components/subscriptions/AddSubscriptionForm';
import { removeSubscription } from './actions';

/** 채널 구독 관리 (SSR REQ-B2). 본인 구독만 최신순 표시(AC-B2.1). */
export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, channel_id, channel_title, channel_url, created_at')
    .order('created_at', { ascending: false });

  const list = subs ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">구독 채널</h1>
          <p className="mt-1 text-sm text-muted-foreground">감시할 유튜브 채널을 관리하세요.</p>
        </header>

        <AddSubscriptionForm />

        {list.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">아직 구독한 채널이 없습니다.</p>
          </div>
        ) : (
          <Card data-testid="subscription-list" className="mt-6 divide-y divide-border">
            {list.map((s) => (
              <div
                key={s.id}
                data-testid="subscription-item"
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <a
                  href={s.channel_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm font-medium hover:underline"
                >
                  {s.channel_title ?? s.channel_id}
                </a>
                <form action={removeSubscription}>
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    data-testid="remove-subscription"
                    className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-danger"
                  >
                    삭제
                  </button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </main>
    </div>
  );
}
