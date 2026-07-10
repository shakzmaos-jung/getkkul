'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/ToastProvider';
import { PLANS, PLAN_ORDER, planRank, type PlanCode } from '@/lib/membership/plans';
import type { MembershipView } from '@/lib/membership/view';
import { changePlan, cancelScheduled } from '@/app/membership/actions';

interface BillingRow {
  period: string;
  planCode: string;
  amount: number;
  creditUsed: number;
  status: string;
  at: string;
  memo: string | null;
}

interface Props {
  view: MembershipView;
  nextBillingText: string;
  pocUntilText: string | null;
  graceUntilText: string | null;
  billingHistory: BillingRow[];
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 사용량 원형 링(도넛). 한도 대비 사용 비율 + 중앙 used/limit + 하단 라벨. 초과면 danger. */
function UsageRing({ label, used, limit }: { label: string; used: number; limit: number }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const over = used >= limit;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-current text-muted-foreground/20" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            className={`stroke-current ${over ? 'text-danger' : 'text-accent'}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-base font-semibold tabular-nums leading-none ${over ? 'text-danger' : ''}`}>
            {used.toLocaleString('ko-KR')}
          </span>
          <span className="text-[11px] tabular-nums leading-tight text-muted-foreground">
            /{limit.toLocaleString('ko-KR')}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

const BILLING_STATUS_LABEL: Record<string, string> = {
  success: '성공',
  failed: '실패',
  grace: '유예',
  skipped_free: 'Free',
  proration: '비례정산',
};

export default function MembershipScreen({
  view,
  nextBillingText,
  pocUntilText,
  graceUntilText,
  billingHistory,
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<PlanCode | null>(null);

  const cur = view.planCode;

  function apply(to: PlanCode) {
    setConfirm(null);
    startTransition(async () => {
      const r = await changePlan(to);
      if (r.ok) {
        showToast(
          r.applied === 'immediate'
            ? '업그레이드가 즉시 적용되었습니다'
            : r.applied === 'scheduled'
              ? '다음 주기부터 적용되도록 예약되었습니다'
              : '변경사항이 없습니다',
        );
        router.refresh();
      } else {
        showToast(r.error);
      }
    });
  }

  function undo() {
    startTransition(async () => {
      const r = await cancelScheduled();
      if (r.ok) {
        showToast('예약된 변경을 취소했습니다');
        router.refresh();
      } else showToast(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 얼리버드 무료 배너 */}
      {view.pocActive && pocUntilText && (
        <Card className="border-accent/30 bg-accent/10 p-4">
          <p className="text-sm font-medium">🎉 얼리버드 무료 체험 중 — Medium 혜택 무료</p>
          <p className="mt-1 text-xs text-muted-foreground">{pocUntilText}까지 무료입니다.</p>
        </Card>
      )}

      {/* 유예 상태 */}
      {view.status === 'grace' && graceUntilText && (
        <Card className="border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">결제 유예 중</p>
          <p className="mt-1 text-xs text-muted-foreground">
            크레딧 부족으로 결제가 지연됐어요. {graceUntilText}까지 충전하지 않으면 Free 로 전환됩니다.
          </p>
        </Card>
      )}

      {/* 현재 플랜 + 사용량 */}
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">현재 플랜</p>
            <p className="text-xl font-semibold tracking-tight">
              {view.planName}
              {view.status === 'canceled' && (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  해지 예약됨
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">다음 결제일</p>
            <p className="text-sm font-medium">{nextBillingText}</p>
            <p className="text-xs text-muted-foreground">
              {view.pocActive ? '얼리버드 무료 체험 중' : won(view.price) + '/월'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <UsageRing label="구독 채널" used={view.usage.channel} limit={view.limits.channel} />
          <UsageRing label="다이제스트" used={view.usage.digest} limit={view.limits.digest} />
          <UsageRing label="AI 질의" used={view.usage.ai} limit={view.limits.ai} />
        </div>

        {/* 예약된 변경 배지 + 취소 */}
        {view.scheduledChange && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              다음 주기부터{' '}
              <span className="font-medium text-foreground">
                {view.scheduledChange.cancel ? '해지(Free)' : PLANS[view.scheduledChange.planCode].name}
              </span>{' '}
              적용 예약됨
            </p>
            <Button size="sm" variant="ghost" onClick={undo} disabled={pending} data-testid="cancel-scheduled">
              예약 취소
            </Button>
          </div>
        )}
      </Card>

      {/* 플랜 비교 카드 */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">플랜 변경</h2>
        <div className="grid grid-cols-4 gap-1.5">
          {PLAN_ORDER.map((code) => {
            const p = PLANS[code];
            const isCurrent = code === cur;
            const up = planRank(code) > planRank(cur);
            // 얼리버드 기간엔 현재(Medium) 외 플랜은 잠금(추후 오픈).
            const locked = view.pocActive && !isCurrent;
            return (
              <Card
                key={code}
                onClick={locked ? () => showToast('추후 오픈 예정입니다') : undefined}
                className={`flex flex-col items-center gap-1.5 p-2 text-center ${
                  isCurrent
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                    : locked
                      ? 'cursor-pointer opacity-50 transition-opacity hover:opacity-70'
                      : ''
                }`}
                data-testid={`plan-${code}`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                {isCurrent && view.pocActive ? (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-background">
                    얼리버드 무료
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {p.price === 0 ? '무료' : won(p.price)}
                  </span>
                )}

                {/* 한도: 라벨 좌 · 수치 우 */}
                <div className="flex w-full flex-col gap-0.5 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>채널</span>
                    <span className="tabular-nums text-foreground/70">{p.channelLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>다이제</span>
                    <span className="tabular-nums text-foreground/70">
                      {p.digestLimit.toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI질의</span>
                    <span className="tabular-nums text-foreground/70">{p.aiQueryLimit}</span>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="mt-auto w-full rounded-lg border border-accent/40 bg-accent/15 px-1 py-1.5 text-[11px] font-semibold text-accent">
                    현재 플랜
                  </span>
                ) : locked ? (
                  <span className="mt-auto w-full rounded-lg bg-muted px-1 py-1.5 text-[11px] text-muted-foreground">
                    추후 오픈
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={up ? 'primary' : 'secondary'}
                    className="mt-auto w-full px-1"
                    disabled={pending}
                    onClick={() => setConfirm(code)}
                    data-testid={`change-${code}`}
                  >
                    {up ? '업그레이드' : code === 'free' ? '해지' : '다운'}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* 결제 내역 */}
      {billingHistory.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">결제 내역</h2>
          <Card className="divide-y divide-border">
            {billingHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="font-medium">
                    {PLANS[h.planCode as PlanCode]?.name ?? h.planCode} · {BILLING_STATUS_LABEL[h.status] ?? h.status}
                  </p>
                  <p className="text-muted-foreground">{h.at}</p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums">{won(h.amount)}</p>
                  {h.creditUsed > 0 && (
                    <p className="text-muted-foreground">크레딧 {won(h.creditUsed)}</p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* 변경 확인 다이얼로그 */}
      {confirm && (
        <ChangeConfirm
          from={cur}
          to={confirm}
          proration={view.upgradeProration[confirm]}
          pocActive={view.pocActive}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={() => apply(confirm)}
        />
      )}
    </div>
  );
}

function ChangeConfirm({
  from,
  to,
  proration,
  pocActive,
  pending,
  onCancel,
  onConfirm,
}: {
  from: PlanCode;
  to: PlanCode;
  proration?: number;
  pocActive: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const up = planRank(to) > planRank(from);
  const cancel = to === 'free';
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold">
          {up ? `${PLANS[to].name} 업그레이드` : cancel ? '멤버십 해지' : `${PLANS[to].name} 다운그레이드`}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {up ? (
            <>
              지금 올리면 남은 기간 차액{' '}
              <span className="font-semibold text-foreground">{won(proration ?? 0)}</span>
              {pocActive ? '(무PG 기간이라 실제 청구 0원)' : '이 즉시 크레딧에서 차감됩니다'}, 상위 혜택이
              즉시 적용됩니다.
            </>
          ) : cancel ? (
            <>다음 결제일에 결제하지 않고, 이번 주기 종료일에 Free 로 전환됩니다. 이번 주기 혜택은 유지되고 환급은 없습니다.</>
          ) : (
            <>다음 주기부터 적용됩니다. 이번 주기는 현재 혜택을 유지하며 환급은 없습니다. 채널이 한도를 넘으면 초과분은 비활성(보관)됩니다.</>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            취소
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={pending} data-testid="confirm-change">
            {pending ? <Spinner size={14} /> : up ? '업그레이드' : cancel ? '해지' : '변경 예약'}
          </Button>
        </div>
      </div>
    </div>
  );
}
