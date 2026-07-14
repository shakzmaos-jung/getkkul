import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export interface HomeStatGroup {
  count: number;
  originalText: string; // 원본 영상 시간 합계 (예: "12시간 3분")
  readText: string; // 읽는 시간 합계
}

interface Props {
  total: HomeStatGroup; // 총 누적
  month: HomeStatGroup; // 이번달
  channels: { active: number; paused: number };
}

/** 실적 숫자(가장 강조) — 크기·색으로만 위계를 준다. bold 미사용(요청). */
function BigNumber({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-2xl font-normal leading-none tracking-tight tabular-nums text-foreground sm:text-[1.75rem]">
        {value.toLocaleString('ko-KR')}
      </span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </span>
  );
}

/** 약한 위계 보조 수치 — 크기 down · 색 톤 다운. */
function SubStat({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[11px] leading-snug text-muted-foreground/70">
      {label} <span className="tabular-nums text-muted-foreground">{value}</span>
    </p>
  );
}

const CELL =
  'flex h-full flex-col gap-1.5 p-3 transition-colors hover:border-accent/30 sm:p-4';
const LABEL = 'text-[11px] text-muted-foreground sm:text-xs';

/**
 * 홈 상단 실적 대시보드 — 1×3 그리드. 각 셀은 강조 실적 숫자(크게) + 약한 보조 수치(작게·톤다운).
 * (1) 총 누적 다이제스트 (2) 이번달 다이제스트 (3) 구독 중인 채널. 셀 클릭 시 관련 화면으로 이동.
 */
export default function HomeStatsGrid({ total, month, channels }: Props) {
  return (
    <div data-testid="home-stats" className="grid grid-cols-3 gap-2 sm:gap-3">
      <Link href="/feed" data-testid="stat-total" className="block min-w-0">
        <Card className={CELL}>
          <span className={LABEL}>총 누적 다이제스트</span>
          <BigNumber value={total.count} unit="개" />
          <div className="mt-0.5 flex flex-col gap-0.5">
            <SubStat label="원본 영상" value={total.originalText} />
            <SubStat label="읽는 시간" value={total.readText} />
          </div>
        </Card>
      </Link>

      <Link href="/feed" data-testid="stat-month" className="block min-w-0">
        <Card className={CELL}>
          <span className={LABEL}>이번달 다이제스트</span>
          <BigNumber value={month.count} unit="개" />
          <div className="mt-0.5 flex flex-col gap-0.5">
            <SubStat label="원본 영상" value={month.originalText} />
            <SubStat label="읽는 시간" value={month.readText} />
          </div>
        </Card>
      </Link>

      <Link href="/subscriptions" data-testid="stat-channels" className="block min-w-0">
        <Card className={CELL}>
          <span className={LABEL}>구독 중인 채널</span>
          <BigNumber value={channels.active} unit="개" />
          <div className="mt-0.5 flex flex-col gap-0.5">
            <SubStat label="일시정지" value={`${channels.paused}개`} />
          </div>
        </Card>
      </Link>
    </div>
  );
}
