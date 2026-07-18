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
import { TabCards } from '@/components/ui/TabCards';
import BillingHistoryCards from '@/components/membership/BillingHistoryCards';
import type { BillingCard } from '@/lib/membership/history';

interface Props {
  view: MembershipView;
  nextBillingText: string;
  pocUntilText: string | null;
  graceUntilText: string | null;
  billingCards: BillingCard[];
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

export default function MembershipScreen({
  view,
  nextBillingText,
  pocUntilText,
  graceUntilText,
  billingCards,
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<PlanCode | null>(null);
  const [tab, setTab] = useState<'current' | 'history'>('current');

  const cur = view.planCode;
  const scheduledTarget: PlanCode | null = view.scheduledChange
    ? view.scheduledChange.cancel
      ? 'free'
      : view.scheduledChange.planCode
    : null;

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
      {/* 얼리버드 무료 배너 — 블루 틴트 배경 + 블루 테두리(라이트/다크 유사한 체감). 텍스트는 다른 배너와 동일 크기.
          일반 div(Card 미사용)로 bg 충돌 회피. */}
      {view.pocActive && pocUntilText && (
        <div
          data-testid="poc-banner"
          className="rounded-xl border border-accent bg-accent/10 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <span aria-hidden>🎉</span>
            얼리버드 무료 체험 중 — {view.planName} 혜택 무료
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pocUntilText}까지 모든 {view.planName} 기능을 무료로 쓸 수 있어요.
          </p>
        </div>
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

      <TabCards
        ariaLabel="현재 멤버십 / 멤버십 이용내역"
        active={tab}
        onChange={(k) => setTab(k as 'current' | 'history')}
        tabs={[
          { key: 'current', title: '현재 멤버십' },
          { key: 'history', title: '멤버십 이용내역', count: billingCards.length },
        ]}
      />

      {tab === 'current' && (
        <>
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
            const isScheduled = code === scheduledTarget && !isCurrent;
            return (
              <Card
                key={code}
                className={`flex flex-col items-center gap-1.5 p-2 text-center ${
                  isCurrent
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                    : isScheduled
                      ? 'border-danger/50 ring-1 ring-danger/25'
                      : ''
                }`}
                data-testid={`plan-${code}`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                {isScheduled && (
                  <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-danger">
                    예약됨
                  </span>
                )}
                {/* PoC 중엔 유료 플랜(Small/Medium/Large) 얼리버드 무료. Free 는 원래 무료. */}
                {view.pocActive && p.price > 0 ? (
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
                ) : isScheduled ? (
                  // '현재 플랜' span 과 동일 치수(px-1·py-1.5·text-[11px])로 1행 유지. Button(size sm px-3) 은 좁은 카드에서 2행 래핑됨.
                  <button
                    type="button"
                    onClick={undo}
                    disabled={pending}
                    className="mt-auto w-full whitespace-nowrap rounded-lg border border-danger/40 bg-danger/10 px-1 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                    data-testid={`cancel-${code}`}
                  >
                    예약 취소
                  </button>
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
        </>
      )}

      {tab === 'history' && <BillingHistoryCards cards={billingCards} />}

      {/* 변경 확인 다이얼로그 */}
      {confirm && (
        <ChangeConfirm
          from={cur}
          to={confirm}
          proration={view.upgradeProration[confirm]}
          pocActive={view.pocActive}
          pending={pending}
          nextBillingText={nextBillingText}
          activeChannels={view.usage.channel}
          onCancel={() => setConfirm(null)}
          onConfirm={() => apply(confirm)}
        />
      )}
    </div>
  );
}

/** 한도 비교 한 줄(현재 → 변경 후). 감소면 red 강조 + 옵션 note(예: 채널 정지 수). */
function LimitRow({ label, fromV, toV, note }: { label: string; fromV: number; toV: number; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        <span className="text-muted-foreground">{fromV.toLocaleString('ko-KR')}</span>
        <span className="mx-1 text-muted-foreground">→</span>
        <span className={toV < fromV ? 'font-semibold text-danger' : 'font-medium text-foreground'}>
          {toV.toLocaleString('ko-KR')}
        </span>
        {note && <span className="ml-1 text-[11px] font-medium text-danger">{note}</span>}
      </span>
    </div>
  );
}

function ChangeConfirm({
  from,
  to,
  proration,
  pocActive,
  pending,
  nextBillingText,
  activeChannels,
  onCancel,
  onConfirm,
}: {
  from: PlanCode;
  to: PlanCode;
  proration?: number;
  pocActive: boolean;
  pending: boolean;
  nextBillingText: string;
  activeChannels: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const up = planRank(to) > planRank(from);
  const cancel = to === 'free';
  const fromP = PLANS[from];
  const toP = PLANS[to];
  const pausedCount = Math.max(0, activeChannels - toP.channelLimit);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-overlay p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 className="text-sm font-semibold">
          {up ? `${toP.name} 업그레이드` : cancel ? '멤버십 해지' : `${toP.name} 다운그레이드`}
        </h2>

        {up ? (
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            지금 올리면 남은 기간 차액{' '}
            <span className="font-semibold text-foreground">{won(proration ?? 0)}</span>
            {pocActive ? '(무PG 기간이라 실제 청구 0원)' : '이 즉시 크레딧에서 차감됩니다'}, 상위 혜택이 즉시
            적용됩니다.
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{nextBillingText}</span>부터{' '}
              {cancel ? 'Free 로 전환(해지)' : `${toP.name} 적용`} — 그때까지 현재{' '}
              <span className="font-medium text-foreground">{fromP.name}</span> 혜택은 유지되고 환급은
              없습니다.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p className="mb-1.5 font-medium text-foreground">변경 후 월 한도</p>
              <div className="space-y-1">
                <LimitRow
                  label="구독 채널"
                  fromV={fromP.channelLimit}
                  toV={toP.channelLimit}
                  note={pausedCount > 0 ? `· ${pausedCount}개 일시정지(보관)` : undefined}
                />
                <LimitRow label="다이제스트" fromV={fromP.digestLimit} toV={toP.digestLimit} />
                <LimitRow label="AI 질의" fromV={fromP.aiQueryLimit} toV={toP.aiQueryLimit} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            취소
          </Button>
          <Button
            variant={up ? 'primary' : 'danger-solid'}
            onClick={onConfirm}
            disabled={pending}
            data-testid="confirm-change"
          >
            {pending ? <Spinner size={14} /> : up ? '업그레이드' : cancel ? '해지 예약' : '다운그레이드 예약'}
          </Button>
        </div>
      </div>
    </div>
  );
}
