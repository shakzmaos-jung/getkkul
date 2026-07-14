import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppHeader from '@/components/layout/AppHeader';
import HomeDashboard, { type HomeDigestItem } from '@/components/home/HomeDashboard';
import ReferralBanner from '@/components/home/ReferralBanner';
import { KST_TIME_ZONE, formatKstDateTime } from '@/lib/time';
import { timed } from '@/lib/perf';
import { mapDigestRow, type ChannelMeta } from '@/lib/feed/map-digests';
import { hms, computeReading, computeValueSummary } from '@/lib/summary/reading';
import { planBadgeText } from '@/lib/membership/plan-badge';

// 친구추천 배너 노출 여부(추후 복원 용이 — 삭제 아님).
const SHOW_REFERRAL_BANNER = false;

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

  const monthStart = `${todayKst.slice(0, 7)}-01T00:00:00+09:00`; // 이번달 1일 00:00 KST

  // 다이제스트 집계·오늘 목록·이번달 가치 통계·플랜 배지를 한 번에(피드와 동일 조건).
  const [{ data: subs }, { data: summary }, { data: todayRows }, { data: membership }, { data: valueRows }] =
    await timed('/', () =>
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
        supabase
          .from('membership')
          .select('plan_code, status, poc_free_until')
          .eq('user_id', user.id)
          .maybeSingle(),
        // 이번달 압축·절약(가치 히어로). 읽는 시간 기준 모드는 normal 로 고정(대표값).
        supabase.rpc('get_month_value_stats', { p_from: monthStart, p_mode: 'normal' }),
      ]),
    );
  const subscriptionCount = (subs ?? []).length; // 구독 수는 일시정지 포함 전체

  // 인사말·배지·이번달 가치.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const greetingName =
    (meta.full_name as string) ?? (meta.name as string) ?? user.email?.split('@')[0] ?? '사용자';
  const badge = planBadgeText(membership ?? null);
  const v = valueRows?.[0] ?? { video_count: 0, video_seconds: 0, read_chars: 0 };
  const value = computeValueSummary(v.video_count, Number(v.video_seconds), Number(v.read_chars));
  const channelById = new Map<string, ChannelMeta>(
    (subs ?? []).map((s) => [
      s.channel_id,
      { title: s.channel_title ?? '', thumbnail: s.channel_thumbnail, handle: s.channel_handle },
    ]),
  );

  const kstDate = new Intl.DateTimeFormat('en-CA', { timeZone: KST_TIME_ZONE });

  const stats = summary?.[0] ?? { today_count: 0, total_count: 0, period_count: 0 };
  const totalDigestCount = stats.total_count; // 그동안 누적(가입 이후 전체)
  const monthlyVideoCount = stats.period_count; // 이번달 누적 영상(현재 멤버십 주기, 주기마다 리셋)

  // 피드 카드와 동일 매핑 → 채널 메타·요약. 홈에선 카드 헤더 메타(읽는 시간·압축률·원본)만 표시한다.
  const today: HomeDigestItem[] = (todayRows ?? [])
    .map((r) => mapDigestRow(r, channelById, 'normal', (iso) => kstDate.format(new Date(iso))))
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .map((m) => {
      const s = m.summaries[m.initialMode] ?? { coreText: '' };
      const { readText, compressionPct } = computeReading(s.coreText, m.durationSeconds);
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
        {SHOW_REFERRAL_BANNER && (
          <div className="mb-6">
            <ReferralBanner />
          </div>
        )}
        <HomeDashboard
          subscriptionCount={subscriptionCount}
          totalDigestCount={totalDigestCount}
          monthlyVideoCount={monthlyVideoCount}
          today={today}
          greetingName={greetingName}
          badge={badge}
          value={value}
        />
      </main>
    </div>
  );
}
