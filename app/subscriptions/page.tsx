import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import AddSubscriptionForm from '@/components/subscriptions/AddSubscriptionForm';
import ChannelSearch from '@/components/subscriptions/ChannelSearch';
import SubscriptionsList from '@/components/subscriptions/SubscriptionsList';
import DismissibleBanner from '@/components/ui/DismissibleBanner';
import FoldNote from '@/components/ui/FoldNote';

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

  // 최신순(created_at desc)은 쿼리에서 정렬됨. 활성/정지 분리는 탭에서 처리.
  const list = subs ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4">
          <DismissibleBanner
            storageKey="gk_subs_intro_dismissed"
            title="구독 채널"
            description="감시할 유튜브 채널을 관리하세요."
          />
        </div>
        <div className="mb-6">
          <FoldNote
            testId="subs-how-to"
            title="채널 관리, 이렇게 해요"
            points={[
              '채널 이름으로 검색해서 바로 추가하세요. 안 나오면 URL·핸들(@…)로도 추가할 수 있어요.',
              '일시정지하면 그 채널의 새 다이제스트를 잠시 멈춰요.',
              '정지해제하면 그 이후에 올라온 영상부터 다시 받아요(밀린 영상은 몰아 오지 않아요).',
              '구독중 / 일시 정지 탭으로 상태별로 볼 수 있어요.',
            ]}
          />
        </div>

        <ChannelSearch />

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">또는 URL·핸들로 직접 추가</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <AddSubscriptionForm />

        {list.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">아직 구독한 채널이 없습니다.</p>
          </div>
        ) : (
          <SubscriptionsList subs={list} />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
