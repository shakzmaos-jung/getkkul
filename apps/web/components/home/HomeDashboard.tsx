import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import ValueHero from '@/components/home/ValueHero';
import HomeStatsGrid, { type HomeStatGroup } from '@/components/home/HomeStatsGrid';
import type { ValueSummary } from '@/lib/summary/reading';

export interface HomeDigestItem {
  id: string;
  title: string;
  url: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelHandle: string | null;
  dateKst: string;
  updatedText: string; // 업데이트 KST yyyy-mm-dd hh:mm
  durationText: string; // 원본 영상 길이(빈 문자열이면 미표시)
  readText: string; // 읽는 시간
  compressionPct: number | null; // 압축률(%) — 길이 미상이면 null
}

function GoToDigestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

interface Props {
  activeChannelCount: number;
  pausedChannelCount: number;
  total: HomeStatGroup; // 총 누적(다이제스트·원본·읽는 시간)
  month: HomeStatGroup; // 이번달(다이제스트·원본·읽는 시간)
  today: HomeDigestItem[];
  greetingName: string;
  badge: string;
  value: ValueSummary;
}

/**
 * 홈 관제판(notification-first). 상단에 지불가치 히어로(이번달 압축·절약 + 인사말·배지),
 * 그 아래 오늘의 다이제스트. 구독 0개면 빈 상태 안내 + 채널 추가 버튼.
 */
export default function HomeDashboard({
  activeChannelCount,
  pausedChannelCount,
  total,
  month,
  today,
  greetingName,
  badge,
  value,
}: Props) {
  const isEmpty = activeChannelCount + pausedChannelCount === 0;

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
          {/* 1. 가치 히어로 — 진입 즉시 이번달 압축·절약 상기(인사말·배지) */}
          <ValueHero name={greetingName} badge={badge} value={value} />

          {/* 2. 실적 대시보드 — 총 누적·이번달·구독 채널(강조 숫자 + 약한 보조수치) */}
          <HomeStatsGrid
            total={total}
            month={month}
            channels={{ active: activeChannelCount, paused: pausedChannelCount }}
          />

          {/* 3. 오늘의 다이제스트 (오늘 KST, 개수 제한 없음) → 앱 내 다이제스트 카드로 이동 */}
          <div data-testid="home-today">
            <h2 className="mb-2 text-base font-semibold tracking-tight">
              오늘의 다이제스트{today.length > 0 ? ` (${today.length})` : ''}
            </h2>
            {today.length > 0 ? (
              <Card className="divide-y divide-border">
                {today.map((it) => (
                  <div key={it.id} data-testid="today-item" className="px-4 py-3">
                    {/* 채널: 아이콘 + 채널명 + 핸들 (좌) / 원본 영상 (우) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <ChannelAvatar src={it.channelThumbnail} title={it.channelTitle} size={20} />
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {it.channelTitle}
                        </p>
                        {it.channelHandle && (
                          <span className="truncate text-[11px] text-muted-foreground/60">
                            {it.channelHandle}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/feed?date=${it.dateKst}#d-${it.id}`}
                        aria-label="다이제스트에서 보기"
                        title="다이제스트에서 보기"
                        data-testid="today-open-digest"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <GoToDigestIcon />
                      </Link>
                    </div>

                    {/* 제목(클릭 시 다이제스트로 이동) + 업데이트 + 읽는 시간·압축률 */}
                    <Link
                      href={`/feed?date=${it.dateKst}#d-${it.id}`}
                      className="mt-1 block transition-colors hover:text-accent"
                    >
                      <p className="text-sm font-semibold leading-snug">{it.title}</p>
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">업데이트 {it.updatedText}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {it.durationText && (
                        <span>
                          원본 영상 <span className="tabular-nums text-foreground/70">{it.durationText}</span>
                        </span>
                      )}
                      {it.durationText && <span aria-hidden>|</span>}
                      <span>
                        읽는 시간 <span className="tabular-nums text-foreground/70">{it.readText}</span>
                      </span>
                      {it.compressionPct !== null && (
                        <span className="ml-1 font-semibold text-accent">
                          (압축률 {it.compressionPct.toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </Card>
            ) : (
              <Card className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">오늘은 아직 다이제스트가 없어요.</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
