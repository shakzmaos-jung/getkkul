import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FeedContent, { type FeedItem } from '@/components/feed/FeedContent';
import AppHeader from '@/components/layout/AppHeader';
import AppFooter from '@/components/layout/AppFooter';
import ScreenGuideHeader from '@/components/ui/ScreenGuideHeader';
import {
  mapDigestRow,
  preloadFromKstDate,
  type ChannelMeta,
} from '@/lib/feed/map-digests';
import { perfStart, perfEnd } from '@/lib/perf';
import type { LengthMode } from '@/lib/summary/format';

// 하이브리드 프리로드 창(KST 일수). 오늘자만 초기 전송 → 첫 진입 페이로드 최소화.
// 이전 날짜는 캘린더에서 선택 시 온디맨드 조회(fetchDigestsForDate, 짧은 스피너).
export const PRELOAD_KST_DAYS = 1;

/** 요약 열람 피드. 카드별 요약 길이(짧게/보통/길게) 선택 — default 는 설정, 영상별 저장값 우선. */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialDate =
    typeof sp.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;

  const supabase = await createClient();
  // proxy 가 이미 세션을 검증했으므로 getSession(네트워크 없음)으로 사용자 id 만 읽는다.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect('/login');

  const perfT0 = perfStart(); // [perf] 데이터페칭 총 소요 관측

  // 캘린더: 오늘(KST) 기본값. 프리로드 창(오늘+어제)의 시작 일자와 그 KST 00:00 타임스탬프.
  const todayKst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const preloadFrom = preloadFromKstDate(todayKst, PRELOAD_KST_DAYS);

  // 전부 서로 독립 → 단일 병렬 대기(직렬 왕복 제거, plan F1).
  // get_feed_digests 가 요약 3모드·길이선택·북마크를 서버 조인으로 합쳐 반환한다
  // (활성구독·기준선·길이필터·ko요약 조건은 RPC 내부 — 피드 표시 규칙의 단일 진실).
  const [{ data: subs }, { data: setting }, { data: digRows }, { data: dateRows }, { data: bmRows }] =
    await Promise.all([
      supabase
        .from('subscriptions')
        .select('channel_id, channel_title, channel_thumbnail, channel_handle, paused')
        .eq('user_id', user.id),
      supabase
        .from('user_settings')
        .select('summary_length')
        .eq('user_id', user.id)
        .maybeSingle(),
      // 디지스트 탭: 프리로드 창(오늘·어제)만 — 날짜경계 인덱스로 빠르게(북마크 OR 제거).
      supabase.rpc('get_feed_digests', {
        p_from: `${preloadFrom}T00:00:00+09:00`,
        p_with_bookmarked: false,
      }),
      supabase.rpc('get_digest_dates'),
      // 북마크 탭: bookmarks 주도 전용 RPC(few rows) — 병렬이라 wall-clock 무증가.
      supabase.rpc('get_bookmarked_digests'),
    ]);
  const globalMode = (setting?.summary_length ?? 'normal') as LengthMode;
  const activeSubs = (subs ?? []).filter((s) => !s.paused);
  const channelById = new Map<string, ChannelMeta>(
    activeSubs.map((s) => [
      s.channel_id,
      { title: s.channel_title ?? '', thumbnail: s.channel_thumbnail, handle: s.channel_handle },
    ]),
  );
  const channels = activeSubs.map((s) => ({
    id: s.channel_id,
    title: s.channel_title ?? s.channel_id,
    thumbnail: s.channel_thumbnail,
  }));

  const kstFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
  const toDate = (iso: string) => kstFmt.format(new Date(iso));
  const items: FeedItem[] = (digRows ?? [])
    .map((r) => mapDigestRow(r, channelById, globalMode, toDate))
    .filter((m): m is FeedItem => m !== null);
  const bookmarkedItems: FeedItem[] = (bmRows ?? [])
    .map((r) => mapDigestRow(r, channelById, globalMode, toDate))
    .filter((m): m is FeedItem => m !== null);

  // 캘린더 일자별 집계(경량 RPC) — 채널필터 재집계용으로 (채널, 일자, 수) 그대로 전달.
  const digestDates = (dateRows ?? []).map((r) => ({ c: r.channel_id, d: r.kst_date, n: r.cnt }));

  perfEnd('/feed', perfT0);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ScreenGuideHeader
            title="다이제스트"
            description="구독한 채널의 새 영상 요약입니다. 카드마다 요약 길이를 바꿀 수 있어요."
            points={[
              '구독한 채널의 새 영상을 대신 보고, 핵심만 요약해 카드로 보여드려요.',
              '카드마다 짧게 / 보통 / 길게로 요약 길이를 바꿀 수 있어요.',
              '달력에서 날짜를 고르고 채널 필터로 좁혀 볼 수 있어요.',
              '북마크(노란 아이콘)로 저장하면 상단 "북마크" 탭에서 모아볼 수 있어요.',
              'AI 배지를 눌러 이 콘텐츠에 대해 궁금한 점을 물어볼 수 있어요.',
            ]}
          />
        </div>

        {items.length === 0 && digestDates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">아직 요약된 영상이 없습니다.</p>
            <Link
              href="/subscriptions"
              className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
            >
              채널 구독하기 →
            </Link>
          </div>
        ) : (
          <FeedContent
            items={items}
            bookmarkedItems={bookmarkedItems}
            channels={channels}
            digestDates={digestDates}
            todayKst={todayKst}
            initialDate={initialDate}
            preloadFrom={preloadFrom}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
}
