import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import HomeDashboard, { type HomeRecentItem } from '@/components/home/HomeDashboard';
import { activeSinceByChannel, isAfterActiveSince } from '@/lib/subscriptions/active-window';
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
    .select('channel_id, channel_title, paused, active_since')
    .eq('user_id', user.id);
  const subsList = subs ?? [];
  const subscriptionCount = subsList.length; // 구독 수는 일시정지 포함 전체
  // 다이제스트(오늘/누적/최근)는 일시정지 채널 제외 + 정지해제 기준선 이후만.
  const activeSubs = subsList.filter((s) => !s.paused);
  const sinceByChannel = activeSinceByChannel(activeSubs);
  const channelIds = [...new Set(activeSubs.map((s) => s.channel_id))];
  const titleById = new Map(activeSubs.map((s) => [s.channel_id, s.channel_title ?? '']));

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
    // done 영상 전체를 조회한 뒤 기준선(active_since) 필터 → 누적/오늘/최근 집계.
    // (기준선은 채널별이라 count 쿼리로 못 걸러 애플리케이션에서 필터·집계한다. 개인 규모라 부담 적음.)
    const { data: videos } = await supabase
      .from('videos')
      .select('id, title, url, channel_id, published_at, created_at')
      .eq('status', 'done')
      .in('channel_id', channelIds)
      .order('published_at', { ascending: false });
    const activeRows = (videos ?? []).filter((v) =>
      isAfterActiveSince(v.created_at, sinceByChannel.get(v.channel_id)),
    );
    // 다이제스트 = 요약이 있는 영상만(피드 표시 기준과 일치) → 카운트와 실제 노출 일치.
    const { data: sums } = await supabase
      .from('summaries')
      .select('video_id')
      .eq('language', 'ko');
    const summarized = new Set((sums ?? []).map((s) => s.video_id));
    const rows = activeRows.filter((v) => summarized.has(v.id));
    totalDigestCount = rows.length;
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
