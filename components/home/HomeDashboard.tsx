import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export interface HomeDigestItem {
  id: string;
  title: string;
  channelTitle: string;
  time: string;
  dateKst: string;
}

interface Props {
  subscriptionCount: number;
  totalDigestCount: number;
  today: HomeDigestItem[];
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
  totalDigestCount,
  today,
}: Props) {
  const isEmpty = subscriptionCount === 0;

  return (
    <div className="flex flex-col gap-6">
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
          {/* 3. 오늘의 다이제스트 (오늘 KST, 개수 제한 없음) → 앱 내 다이제스트 카드로 이동 */}
          <div data-testid="home-today">
            <h2 className="mb-2 text-sm font-semibold">
              오늘의 다이제스트{today.length > 0 ? ` (${today.length})` : ''}
            </h2>
            {today.length > 0 ? (
              <Card className="divide-y divide-border">
                {today.map((it) => (
                  <Link
                    key={it.id}
                    href={`/feed?date=${it.dateKst}#d-${it.id}`}
                    data-testid="today-item"
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
            ) : (
              <Card className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">오늘은 아직 다이제스트가 없어요.</p>
              </Card>
            )}
          </div>

          {/* 4. 누적 다이제스트 · 구독 채널 통계(순서: 누적 → 구독) */}
          <div data-testid="home-stats" className="grid grid-cols-2 gap-3">
            <StatLink
              href="/feed"
              testId="stat-total"
              label="누적 다이제스트"
              value={String(totalDigestCount)}
            />
            <StatLink
              href="/subscriptions"
              testId="stat-subscriptions"
              label="구독 채널"
              value={String(subscriptionCount)}
            />
          </div>
        </>
      )}
    </div>
  );
}
