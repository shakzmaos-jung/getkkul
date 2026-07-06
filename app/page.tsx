import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import HomeDashboard, { type HomeRecentItem } from '@/components/home/HomeDashboard';
import { KST_TIME_ZONE } from '@/lib/time';

/**
 * 홈 = notification-first 관제판. 콘텐츠 리더가 아니라 설정·상태 확인용.
 * 데이터는 현재 로그인 사용자 기준(RLS)으로 조회한다.
 */
export default async function Home() {
  const supabase = await createClient();
  // proxy(updateSession)가 요청마다 getUser 로 세션을 이미 검증·갱신하므로
  // 여기서는 네트워크 왕복 없는 getSession 으로 사용자 id 만 읽는다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('channel_id, channel_title')
    .eq('user_id', user.id);
  const subsList = subs ?? [];
  const subscriptionCount = subsList.length;
  const channelIds = [...new Set(subsList.map((s) => s.channel_id))];
  const titleById = new Map(subsList.map((s) => [s.channel_id, s.channel_title ?? '']));

  const kstDate = new Intl.DateTimeFormat('en-CA', { timeZone: KST_TIME_ZONE });
  const kstShort = new Intl.DateTimeFormat('sv-SE', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const todayKst = kstDate.format(new Date());

  let todayDigestCount = 0;
  let totalDigestCount = 0;
  let recent: HomeRecentItem[] = [];

  if (channelIds.length > 0) {
    // 최근 50개(오늘 집계·미리보기용)와 전체 누적 수(count)를 병렬 조회.
    const [{ data: videos }, { count }] = await Promise.all([
      supabase
        .from('videos')
        .select('id, title, url, channel_id, published_at')
        .eq('status', 'done')
        .in('channel_id', channelIds)
        .order('published_at', { ascending: false })
        .limit(50),
      supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done')
        .in('channel_id', channelIds),
    ]);
    totalDigestCount = count ?? 0;
    const rows = videos ?? [];
    for (const v of rows) {
      if (v.published_at && kstDate.format(new Date(v.published_at)) === todayKst) {
        todayDigestCount++;
      }
    }
    recent = rows.slice(0, 5).map((v) => ({
      id: v.id,
      title: v.title ?? '',
      channelTitle: titleById.get(v.channel_id) ?? '',
      time: v.published_at ? kstShort.format(new Date(v.published_at)) : '',
      dateKst: v.published_at ? kstDate.format(new Date(v.published_at)) : '',
    }));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <HomeDashboard
          subscriptionCount={subscriptionCount}
          todayDigestCount={todayDigestCount}
          totalDigestCount={totalDigestCount}
          recent={recent}
        />
      </main>
      <AppFooter />
    </div>
  );
}
