import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import AddSubscriptionForm from '@/components/subscriptions/AddSubscriptionForm';
import SubscriptionRowActions from '@/components/subscriptions/SubscriptionRowActions';

/** 구독시작일시(created_at, UTC) 를 KST yyyy-mm-dd hh:mm 으로 표시(sv-SE=ISO 형식). */
function formatSubscribedDateTime(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** 채널 구독 관리 (SSR REQ-B2). 본인 구독만 최신순(구독 시작일 내림차순) 표시(AC-B2.1). */
export default async function SubscriptionsPage() {
  const supabase = await createClient();
  // proxy 가 이미 세션을 검증했으므로 getSession(네트워크 없음)으로 인증만 확인.
  // 목록 쿼리는 RLS(user_id = auth.uid())로 본인 행만 반환된다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(
      'id, channel_id, channel_title, channel_url, channel_thumbnail, channel_handle, created_at, paused',
    )
    .order('created_at', { ascending: false });

  // 활성 채널 먼저, 일시정지 채널을 하단으로. stable sort 라 그룹 내 최신순(created_at desc) 유지.
  const list = [...(subs ?? [])].sort((a, b) => Number(a.paused) - Number(b.paused));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
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
                <div className={`flex min-w-0 items-center gap-3 ${s.paused ? 'opacity-50' : ''}`}>
                  <ChannelAvatar
                    src={s.channel_thumbnail}
                    title={s.channel_title ?? s.channel_id}
                    size={36}
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <a
                        href={s.channel_url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {s.channel_title ?? s.channel_id}
                      </a>
                      {s.channel_handle && (
                        <span className="shrink-0 text-xs text-muted-foreground/70">
                          {s.channel_handle}
                        </span>
                      )}
                      {s.paused && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          일시정지됨
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      구독시작일시 {formatSubscribedDateTime(s.created_at)}
                    </p>
                  </div>
                </div>
                <SubscriptionRowActions
                  id={s.id}
                  paused={s.paused}
                  title={s.channel_title ?? s.channel_id}
                />
              </div>
            ))}
          </Card>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
