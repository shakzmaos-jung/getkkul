import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import HowToUse from '@/components/home/HowToUse';

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
  nextSlot: string;
  recent: HomeRecentItem[];
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
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
  nextSlot,
  recent,
}: Props) {
  const isEmpty = subscriptionCount === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. 서비스 소개 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">🍯</span>
          <h1 className="text-2xl font-semibold tracking-tight">겟꿀</h1>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          구독한 유튜브 채널의 새 영상을 대신 보고, 핵심만 하루 세 번 정해진 시각에 보내드려요.
        </p>
      </div>

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
          {/* 3. 통계 3종 (구독 채널은 클릭 시 관리 화면으로) */}
          <div data-testid="home-stats" className="grid grid-cols-3 gap-3">
            <Link
              href="/subscriptions"
              data-testid="stat-subscriptions"
              className="group relative rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-foreground/25 hover:bg-muted"
            >
              <div className="text-2xl font-semibold tracking-tight">{subscriptionCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">구독 채널</div>
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
            <Stat testId="stat-today" label="오늘 다이제스트" value={String(todayDigestCount)} />
            <Stat testId="stat-next-slot" label="다음 발송" value={nextSlot} />
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
