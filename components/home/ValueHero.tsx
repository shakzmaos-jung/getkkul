import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import type { ValueSummary } from '@/lib/summary/reading';

interface Props {
  name: string;
  badge: string;
  value: ValueSummary;
  subscriptionCount: number;
  totalDigestCount: number;
}

/**
 * 홈 가치 히어로 — 진입 즉시 지불가치(이번달 압축·절약 시간)를 상기시킨다.
 * 인사말 + 플랜 배지 + 이번달 압축 통계 + 보조 수치(누적·구독).
 */
export default function ValueHero({ name, badge, value, subscriptionCount, totalDigestCount }: Props) {
  const hasStats = value.videoCount > 0;
  return (
    <Card data-testid="value-hero" className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-foreground">{name} 님</span>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
          {badge}
        </span>
      </div>

      {hasStats ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm leading-relaxed text-foreground/85">
            이번달 <b className="font-semibold text-foreground">{value.videoCount}개</b> 영상
            <span className="text-muted-foreground">(원본 {value.originalText})</span>을{' '}
            {value.compressionPct !== null && (
              <>
                약 <b className="font-semibold text-accent">{value.compressionPct.toFixed(0)}%</b> 압축해{' '}
              </>
            )}
            읽을거리 <b className="font-semibold text-foreground">{value.readText}</b>로 만들었어요.
          </p>
          <p className="text-sm font-medium text-foreground">
            ⏱ 약 <span className="text-accent">{value.savedText}</span>을 아껴 드렸어요.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          이번달 아직 다이제스트가 없어요. 새 영상이 오면 여기서 아낀 시간을 알려드릴게요.
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <Link href="/feed" data-testid="hero-total" className="transition-colors hover:text-foreground">
          그동안 누적 <b className="text-foreground/80">{totalDigestCount}</b>
        </Link>
        <span aria-hidden>·</span>
        <Link href="/subscriptions" data-testid="hero-subs" className="transition-colors hover:text-foreground">
          구독 <b className="text-foreground/80">{subscriptionCount}</b>
        </Link>
      </div>
    </Card>
  );
}
