'use client';

import { Card } from '@/components/ui/Card';
import { PLANS } from '@/lib/membership/plans';
import type { BillingCard } from '@/lib/membership/history';

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
const planName = (c: string | null) =>
  c ? ((PLANS as Record<string, { name: string } | undefined>)[c]?.name ?? c) : '—';
const kstDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));

const STATUS: Record<string, { label: string; cls: string }> = {
  success: { label: '결제 완료', cls: 'bg-accent/15 text-accent' },
  failed: { label: '결제 실패', cls: 'bg-danger/15 text-danger' },
  grace: { label: '결제 유예', cls: 'bg-danger/15 text-danger' },
  skipped_free: { label: 'PoC 무료', cls: 'bg-muted text-muted-foreground' },
  proration: { label: '비례정산', cls: 'bg-accent/15 text-accent' },
};

/** 멤버십 이용내역: 구독 기간별 카드(플랜·청구/결제·수단·상태·결제일·월중 업그레이드). */
export default function BillingHistoryCards({ cards }: { cards: BillingCard[] }) {
  if (cards.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        아직 멤버십 이용내역이 없습니다.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="billing-history">
      {cards.map((c) => {
        const st = STATUS[c.status] ?? { label: c.status, cls: 'bg-muted text-muted-foreground' };
        return (
          <Card key={c.key} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">구독 기간</p>
                <p className="text-sm font-semibold tabular-nums">
                  {c.periodStart} ~ {c.periodEnd ?? '진행 중'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {c.sample && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    샘플
                  </span>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">멤버십 플랜</p>
                <p className="font-medium">{c.planName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">결제일</p>
                <p className="font-medium tabular-nums">{kstDate(c.paidAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">청구 금액</p>
                <p className="font-medium tabular-nums">{won(c.billed)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">결제 금액</p>
                <p className="font-medium tabular-nums">{won(c.paidCredit)}</p>
              </div>
            </div>

            {/* 결제 수단(복합결제 대비 수단별 금액) */}
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1 text-xs text-muted-foreground">
                결제 수단{c.methods.length > 1 ? ' (복합결제)' : ''}
              </p>
              <div className="flex flex-col gap-0.5">
                {c.methods.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="tabular-nums">{won(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 월 중 플랜 업그레이드(같은 카드 내 표시) */}
            {c.upgrades.length > 0 && (
              <div className="mt-3 rounded-lg bg-accent/5 p-2.5">
                <p className="mb-1 text-xs font-medium text-accent">월 중 플랜 업그레이드</p>
                <div className="flex flex-col gap-1">
                  {c.upgrades.map((u, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {planName(u.fromPlan)} <span className="text-muted-foreground">→</span>{' '}
                        <span className="font-medium">{planName(u.toPlan)}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        +{won(u.amount)} · {kstDate(u.at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
