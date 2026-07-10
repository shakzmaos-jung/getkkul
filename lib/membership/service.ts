/**
 * 멤버십 서비스 (server-only). 날짜·비례정산은 테스트된 순수 함수로 계산하고,
 * 원자적 쓰기·크레딧 차감은 SECURITY DEFINER RPC(admin 클라이언트)로 위임한다.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { isUpgrade, type PlanCode } from './plans';
import { idempotencyKey } from './charge';
import {
  freshMembershipValues,
  computeProration,
  POC_FREE_UNTIL_ISO,
  POC_DEFAULT_PLAN,
  type Proration,
} from './period';

export { freshMembershipValues, computeProration, POC_FREE_UNTIL_ISO, POC_DEFAULT_PLAN };
export type { Proration };

/** 멤버십 보장(없으면 PoC 무료 Medium 로 생성). 신규 로그인·페이지 진입 시 호출. */
export async function ensureMembership(userId: string, now: Date = new Date()): Promise<void> {
  const admin = createAdminClient();
  const v = freshMembershipValues(now);
  await admin.rpc('membership_bootstrap', {
    p_user: userId,
    p_plan: POC_DEFAULT_PLAN,
    p_status: 'poc_free',
    p_anchor: v.anchor,
    p_period_start: v.periodStart,
    p_period_end: v.periodEnd,
    p_next_billing: v.nextBillingAt,
    p_poc_free_until: POC_FREE_UNTIL_ISO,
  });
}

type MembershipRow = {
  plan_code: PlanCode;
  status: string;
  anchor_day: number;
  period_start: string;
  period_end: string;
  next_billing_at: string;
  scheduled_change: { plan_code?: string; cancel?: boolean } | null;
  grace_until: string | null;
  poc_free_until: string | null;
};

async function loadMembership(userId: string): Promise<MembershipRow> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('membership')
    .select(
      'plan_code, status, anchor_day, period_start, period_end, next_billing_at, scheduled_change, grace_until, poc_free_until',
    )
    .eq('user_id', userId)
    .single();
  if (!data) throw new Error('membership not found');
  return data as MembershipRow;
}

/** 업그레이드 실행: 즉시 비례정산 차감(무PG 0) + 상위 즉시 적용(AC-C2). */
export async function upgradePlan(
  userId: string,
  toPlan: PlanCode,
  now: Date = new Date(),
): Promise<Proration> {
  const m = await loadMembership(userId);
  if (!isUpgrade(m.plan_code, toPlan)) throw new Error('not an upgrade');
  const p = computeProration(m.plan_code, toPlan, m.period_start, m.anchor_day, now);
  const admin = createAdminClient();
  await admin.rpc('membership_apply_upgrade', {
    p_user: userId,
    p_to: toPlan,
    p_charge: p.charge,
    p_proration_raw: p.raw,
    p_idem: `${idempotencyKey(userId, m.period_start)}:up:${toPlan}`,
    p_billing_period: m.period_start,
  });
  return p;
}

/** 다운그레이드/해지 예약(다음 주기 적용, AC-A1.3). cancel=true → 다음 주기 Free. */
export async function scheduleChange(
  userId: string,
  toPlan: PlanCode,
  cancel: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc('membership_schedule_change', { p_user: userId, p_to: toPlan, p_cancel: cancel });
}

/** 예약 변경 취소(AC-A1.4). */
export async function cancelScheduledChange(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc('membership_cancel_scheduled', { p_user: userId });
}
