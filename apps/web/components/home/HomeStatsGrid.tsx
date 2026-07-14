import Link from 'next/link';
import { Card } from '@/components/ui/Card';

export interface CumulativeStats {
  digestCount: number; // 총 누적 다이제스트
  originalText: string; // 원본 영상 시간 누계 (예: "820시간 3분")
  compressedText: string; // 압축 영상 시간 누계(읽을거리 시간)
  savedText: string; // 아껴진 시간
  compressionPct: number | null; // 압축률(%)
}

const NUM = 'text-2xl font-normal leading-none tracking-tight tabular-nums text-foreground sm:text-[1.75rem]';
const UNIT = 'text-sm text-muted-foreground';

/** 실적 숫자(개수) — 크게, bold 미사용(요청). 위계는 크기·색으로만. */
function BigCount({ value }: { value: number }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className={NUM}>{value.toLocaleString('ko-KR')}</span>
      <span className={UNIT}>개</span>
    </span>
  );
}

/** 시간 문자열("820시간 3분")을 숫자 크게·단위 작게로 렌더. bold 미사용. */
function BigTime({ text }: { text: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
      {text.split(' ').map((seg, i) => {
        const m = seg.match(/^(\d+)(.*)$/);
        return m ? (
          <span key={i} className="flex items-baseline gap-0.5">
            <span className={NUM}>{m[1]}</span>
            <span className={UNIT}>{m[2]}</span>
          </span>
        ) : (
          <span key={i} className={NUM}>
            {seg}
          </span>
        );
      })}
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

// h-full+w-full: Link(flex 그리드 아이템)가 stretch 로 늘어난 높이를 Card 가 확실히 채우도록(두 카드 높이 일치).
const CELL = 'flex h-full w-full flex-col gap-1.5 p-3 transition-colors hover:border-accent/30 sm:p-4';
const LABEL = 'text-[11px] text-muted-foreground sm:text-xs';

/**
 * 홈 상단 실적 대시보드 — 1×2 그리드(누적 가치). 각 셀은 강조 실적(크게) + 약한 보조 수치(작게·톤다운).
 * (1) 총 누적 다이제스트(+원본 영상 시간 누계) (2) 압축 영상 시간 누계(+아껴진 시간·압축률). 셀 클릭 시 피드로.
 */
export default function HomeStatsGrid({
  digestCount,
  originalText,
  compressedText,
  savedText,
  compressionPct,
}: CumulativeStats) {
  return (
    <div data-testid="home-stats" className="grid grid-cols-2 gap-2 sm:gap-3">
      <Link href="/feed" data-testid="stat-total" className="flex min-w-0">
        <Card className={CELL}>
          <span className={LABEL}>총 누적 다이제스트</span>
          <BigCount value={digestCount} />
          <div className="mt-0.5 flex flex-col gap-0.5">
            <SubStat label="원본 영상 시간" value={originalText} />
          </div>
        </Card>
      </Link>

      <Link href="/feed" data-testid="stat-compressed" className="flex min-w-0">
        <Card className={CELL}>
          <span className={LABEL}>압축 영상 시간 누계</span>
          <BigTime text={compressedText} />
          <div className="mt-0.5 flex flex-col gap-0.5">
            <SubStat label="아껴진 시간" value={savedText} />
            {compressionPct !== null && <SubStat label="압축률" value={`${compressionPct.toFixed(0)}%`} />}
          </div>
        </Card>
      </Link>
    </div>
  );
}
