import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import HomeDashboard, { type HomeDigestItem } from '@/components/home/HomeDashboard';
import ReferralBanner from '@/components/home/ReferralBanner';
import ScreenGuideHeader from '@/components/ui/ScreenGuideHeader';
import { KST_TIME_ZONE } from '@/lib/time';

const GUIDE_LINK = 'font-medium text-accent hover:underline';

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

  // 다이제스트 집계·최근 목록은 SQL 로 계산(피드와 동일 조건: 활성 구독·기준선·길이·ko요약).
  // 앱에서 모든 요약을 가져오면 API max-rows(1000) 상한에 걸려 최신분이 누락돼 과소집계됐다 → RPC 로 이전.
  const [{ data: subs }, { data: summary }, { data: todayRows }] = await Promise.all([
    supabase.from('subscriptions').select('channel_id, channel_title').eq('user_id', user.id),
    supabase.rpc('get_digest_summary'),
    supabase.rpc('get_today_digests'), // 오늘(KST) 다이제스트 전체(제한 없음)
  ]);
  const subscriptionCount = (subs ?? []).length; // 구독 수는 일시정지 포함 전체
  const titleById = new Map((subs ?? []).map((s) => [s.channel_id, s.channel_title ?? '']));

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

  const stats = summary?.[0] ?? { today_count: 0, total_count: 0 };
  const totalDigestCount = stats.total_count;
  const today: HomeDigestItem[] = (todayRows ?? []).map((v) => ({
    id: v.id,
    title: v.title ?? '',
    channelTitle: titleById.get(v.channel_id) ?? '',
    time: v.published_at ? kstShort.format(new Date(v.published_at)) : '',
    dateKst: v.published_at ? kstDate.format(new Date(v.published_at)) : '',
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ReferralBanner />
        </div>
        <div className="mb-6">
          <ScreenGuideHeader
            title="홈"
            description="겟꿀은 유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드리는 서비스입니다."
            points={[
              <>
                관심 있는 유튜브 채널을{' '}
                <Link href="/subscriptions" className={GUIDE_LINK}>
                  구독
                </Link>
                으로 추가하세요.
              </>,
              <>
                <Link href="/feed" className={GUIDE_LINK}>
                  다이제스트
                </Link>
                에서 핵심 요약을 만나보세요.
              </>,
              '이메일 혹은 앱 푸시로 아침(07:30), 점심(11:30), 저녁(17:30)에 알림을 받을 수 있습니다.',
            ]}
          />
        </div>
        <HomeDashboard
          subscriptionCount={subscriptionCount}
          totalDigestCount={totalDigestCount}
          today={today}
        />
      </main>
      <AppFooter />
    </div>
  );
}
