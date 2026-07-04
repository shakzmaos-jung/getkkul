import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">구독 채널</h1>
        <Link href="/" className="text-sm underline">
          홈
        </Link>
      </div>

      <AddSubscriptionForm />

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">아직 구독한 채널이 없습니다.</p>
      ) : (
        <ul data-testid="subscription-list" className="flex flex-col divide-y">
          {list.map((s) => (
            <li
              key={s.id}
              data-testid="subscription-item"
              className="flex items-center justify-between py-3"
            >
              <a
                href={s.channel_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                {s.channel_title ?? s.channel_id}
              </a>
              <form action={removeSubscription}>
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  data-testid="remove-subscription"
                  className="text-xs text-red-500 underline"
                >
                  삭제
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
