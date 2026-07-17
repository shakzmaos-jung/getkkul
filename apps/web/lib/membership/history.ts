// 멤버십 이용내역: billing_history 행을 billing_period 로 그룹핑해 기간당 1 카드로 변환(순수 로직).
// 결제는 크레딧 전용(PG 향후) — methods 는 수단별 금액 리스트로 복합결제에 대비(현재 단일).
import { PLANS } from './plans';

export interface BillingRow {
  period: string; // billing_period 'YYYY-MM-DD'
  planCode: string;
  amount: number; // 청구(정가)
  creditUsed: number; // 크레딧 결제액
  status: string; // success | failed | grace | skipped_free | proration
  at: string; // created_at ISO
  memo: string | null;
}

export interface PaymentMethodLine {
  label: string;
  amount: number;
}
export interface UpgradeLine {
  fromPlan: string | null;
  toPlan: string;
  amount: number;
  at: string; // ISO
}

export interface BillingCard {
  key: string;
  periodStart: string; // 'YYYY-MM-DD'
  periodEnd: string | null; // 'YYYY-MM-DD'
  planCode: string; // 기간 최종 플랜
  planName: string;
  billed: number; // 청구 합
  paidCredit: number; // 결제(크레딧) 합
  methods: PaymentMethodLine[]; // 수단별 결제액(복합결제 대비)
  status: string; // 기준(base) 행 상태
  paidAt: string; // 기준 행 결제일 ISO
  upgrades: UpgradeLine[]; // 월 중 업그레이드(비례정산)
  sample: boolean; // memo === '샘플'
}

const planName = (c: string) => (PLANS as Record<string, { name: string } | undefined>)[c]?.name ?? c;

/** 'YYYY-MM-DD' 에 n일 더한 날짜 문자열(월경계 처리, TZ 무관 순수 날짜 연산). */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 주기 시작일 → 다음 달 같은 날 −1일(대략적 종료일; 정확값은 anchor 기반 currentPeriodEnd 사용). */
function monthlyEnd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return addDays(new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10), -1);
}

/**
 * billing_history 행 → 기간별 카드(최신순).
 * - proration 행 = 월 중 업그레이드. 이전 플랜은 같은 기간 직전 행에서 추론.
 * - 기간 최종 플랜 = 시간순 마지막 행의 plan. periodEnd = 바로 뒤(더 최근) 기간 시작−1일, 최신 기간은 currentPeriodEnd.
 */
export function buildBillingCards(
  rows: BillingRow[],
  opts: { currentPeriodStart?: string; currentPeriodEnd?: string | null } = {},
): BillingCard[] {
  const byPeriod = new Map<string, BillingRow[]>();
  for (const r of rows) {
    const arr = byPeriod.get(r.period) ?? [];
    arr.push(r);
    byPeriod.set(r.period, arr);
  }
  const periods = [...byPeriod.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // 최신순(desc)

  return periods.map((period, i) => {
    const rs = (byPeriod.get(period) ?? [])
      .slice()
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)); // 시간 오름차순
    const base = rs.find((r) => r.status !== 'proration') ?? rs[0];

    const upgrades: UpgradeLine[] = rs
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.status === 'proration')
      .map(({ r, idx }) => {
        let from: string | null = null;
        for (let j = idx - 1; j >= 0; j--) {
          from = rs[j].planCode;
          if (rs[j].planCode !== r.planCode) break;
        }
        return { fromPlan: from, toPlan: r.planCode, amount: r.amount, at: r.at };
      });

    const finalPlan = rs[rs.length - 1].planCode;
    const billed = rs.reduce((s, r) => s + r.amount, 0);
    const paidCredit = rs.reduce((s, r) => s + r.creditUsed, 0);

    const methods: PaymentMethodLine[] = [];
    if (paidCredit > 0) methods.push({ label: '크레딧', amount: paidCredit });
    if (methods.length === 0) {
      methods.push({ label: base.status === 'skipped_free' ? 'PoC 무료' : '결제 없음', amount: 0 });
    }

    // periodEnd: 바로 뒤(더 최근) 기간 시작−1일. 최신 기간이 '현재 멤버십 주기'와 일치하면 정확한 currentPeriodEnd,
    // 아니면(예: 과거 이력만 있고 현재 주기엔 아직 결제행 없음) 월 단위 근사.
    const periodEnd =
      i === 0
        ? period === opts.currentPeriodStart
          ? (opts.currentPeriodEnd ?? null)
          : monthlyEnd(period)
        : addDays(periods[i - 1], -1);

    return {
      key: period,
      periodStart: period,
      periodEnd,
      planCode: finalPlan,
      planName: planName(finalPlan),
      billed,
      paidCredit,
      methods,
      status: base.status,
      paidAt: base.at,
      upgrades,
      sample: rs.some((r) => r.memo === '샘플'),
    };
  });
}
