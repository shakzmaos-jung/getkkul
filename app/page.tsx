import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import HomeDashboard, { type HomeDigestItem } from '@/components/home/HomeDashboard';
import ReferralBanner from '@/components/home/ReferralBanner';
import ScreenGuideHeader from '@/components/ui/ScreenGuideHeader';
import { KST_TIME_ZONE, formatKstDateTime } from '@/lib/time';
import { timed } from '@/lib/perf';
import { mapDigestRow, type ChannelMeta } from '@/lib/feed/map-digests';
import { hms, computeReading } from '@/lib/summary/reading';

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

  // 오늘(KST) 자정 경계 — get_feed_digests 로 오늘치 카드 데이터(요약·길이·북마크 포함)를 가져온다.
  const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: KST_TIME_ZONE }).format(new Date());

  // 다이제스트 집계·오늘 목록은 SQL 로 계산(피드와 동일 조건: 활성 구독·기준선·길이·ko요약).
  const [{ data: subs }, { data: summary }, { data: todayRows }] = await timed('/', () =>
    Promise.all([
      supabase
        .from('subscriptions')
        .select('channel_id, channel_title, channel_thumbnail, channel_handle')
        .eq('user_id', user.id),
      supabase.rpc('get_digest_summary'),
      // 오늘 하루치 카드 데이터(피드 카드와 동일 소스). 다음날 00:00 KST 미만.
      supabase.rpc('get_feed_digests', {
        p_from: `${todayKst}T00:00:00+09:00`,
        p_to: `${todayKst}T24:00:00+09:00`,
      }),
    ]),
  );
  const subscriptionCount = (subs ?? []).length; // 구독 수는 일시정지 포함 전체
  const channelById = new Map<string, ChannelMeta>(
    (subs ?? []).map((s) => [
      s.channel_id,
      { title: s.channel_title ?? '', thumbnail: s.channel_thumbnail, handle: s.channel_handle },
    ]),
  );

  const kstDate = new Intl.DateTimeFormat('en-CA', { timeZone: KST_TIME_ZONE });

  const stats = summary?.[0] ?? { today_count: 0, total_count: 0 };
  const totalDigestCount = stats.total_count;

  // 피드 카드와 동일 매핑 → 채널 메타·요약. 홈에선 카드 헤더 메타(읽는 시간·압축률·원본)만 표시한다.
  const today: HomeDigestItem[] = (todayRows ?? [])
    .map((r) => mapDigestRow(r, channelById, 'normal', (iso) => kstDate.format(new Date(iso))))
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .map((m) => {
      const s = m.summaries[m.initialMode] ?? { coreText: '', bullets: [] };
      const { readText, compressionPct } = computeReading(s.coreText, s.bullets, m.durationSeconds);
      return {
        id: m.id,
        title: m.title,
        url: m.url,
        channelTitle: m.channelTitle,
        channelThumbnail: m.channelThumbnail,
        channelHandle: m.channelHandle,
        dateKst: m.dateKst,
        updatedText: formatKstDateTime(m.publishedAt),
        durationText: m.durationSeconds && m.durationSeconds > 0 ? hms(m.durationSeconds) : '',
        readText,
        compressionPct,
      };
    });

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
    </div>
  );
}
