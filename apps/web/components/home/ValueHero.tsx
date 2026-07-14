import { Card } from '@/components/ui/Card';
import type { ValueSummary } from '@/lib/summary/reading';

interface Props {
  name: string;
  badge: string;
  value: ValueSummary;
}

/**
 * 홈 가치 히어로 — 진입 즉시 지불가치(이번달 압축·절약 시간)를 상기시킨다.
 * 인사말 + 플랜 배지 + 이번달 압축 통계. (그동안 누적·이번달·구독 실적은 HomeStatsGrid 로 분리)
 */
export default function ValueHero({ name, badge, value }: Props) {
  const hasStats = value.videoCount > 0;
  return (
    <Card
      data-testid="value-hero"
      className="border-accent/25 bg-gradient-to-br from-accent/10 to-card p-5"
    >
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
    </Card>
  );
}
