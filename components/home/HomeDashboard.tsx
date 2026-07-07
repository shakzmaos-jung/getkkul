import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import HowToUse from '@/components/home/HowToUse';
import DismissibleBanner from '@/components/ui/DismissibleBanner';

export interface HomeRecentItem {
  id: string;
  title: string;
  channelTitle: string;
  time: string;
  dateKst: string;
}

interface Props {
  subscriptionCount: number;
  todayDigestCount: number;
  totalDigestCount: number;
  recent: HomeRecentItem[];
}

/** 클릭 시 관련 화면으로 이동하는 통계 카드(우상단 화살표 + hover). */
function StatLink({
  href,
  label,
  value,
  testId,
}: {
  href: string;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group relative rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-foreground/25 hover:bg-muted"
    >
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="absolute right-2 top-2 text-muted-foreground/40 transition-colors group-hover:text-foreground"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

/**
 * 홈 관제판(notification-first). 콘텐츠 리더가 아니라 설정·상태 확인용 가벼운 화면.
 * 구독 0개면 통계 대신 빈 상태 안내 + 채널 추가 버튼을 크게 노출한다.
 * 채널 관리 진입은 '구독 채널' 통계 카드 클릭으로 통합(별도 버튼 제거).
 */
export default function HomeDashboard({
  subscriptionCount,
  todayDigestCount,
  totalDigestCount,
  recent,
}: Props) {
  const isEmpty = subscriptionCount === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 서비스 소개 (끌 수 있는 배너) */}
      <DismissibleBanner
        storageKey="gk_intro_dismissed"
        icon="🍯"
        title="겟꿀"
        description="겟꿀은 유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드리는 서비스입니다."
      />

      {/* 2. 사용법 (접이식) */}
      <HowToUse />

      {isEmpty ? (
        /* 빈 상태 */
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            아직 구독한 채널이 없어요. 첫 채널을 추가해보세요.
          </p>
          <Link
            href="/subscriptions"
            data-testid="empty-add-channel"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            채널 추가하기
          </Link>
        </Card>
      ) : (
        <>
          {/* 3. 통계 3종 (구독 채널→관리, 오늘/누적 다이제스트→다이제스트) */}
          <div data-testid="home-stats" className="grid grid-cols-3 gap-3">
            <StatLink
              href="/subscriptions"
              testId="stat-subscriptions"
              label="구독 채널"
              value={String(subscriptionCount)}
            />
            <StatLink
              href="/feed"
              testId="stat-today"
              label="오늘 다이제스트"
              value={String(todayDigestCount)}
            />
            <StatLink
              href="/feed"
              testId="stat-total"
              label="누적 다이제스트"
              value={String(totalDigestCount)}
            />
          </div>

          {/* 4. 최근 다이제스트 미리보기 → 앱 내 다이제스트 카드로 이동 */}
          {recent.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold">최근 다이제스트</h2>
              <Card className="divide-y divide-border">
                {recent.map((it) => (
                  <Link
                    key={it.id}
                    href={`/feed?date=${it.dateKst}#d-${it.id}`}
                    data-testid="recent-item"
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{it.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{it.channelTitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{it.time}</span>
                  </Link>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
