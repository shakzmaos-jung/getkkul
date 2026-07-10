/**
 * 멤버십 화면 데이터 조립 (server-only). membership + usage + 채널수 + 크레딧 잔액 + 비례정산 미리보기.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, PLAN_ORDER, isUpgrade, type PlanCode } from './plans';
import { computeProration } from './period';
import { ensureMembership } from './service';

export interface MembershipView {
  planCode: PlanCode;
  planName: string;
  price: number;
  status: string;
  limits: { channel: number; digest: number; ai: number };
  usage: { channel: number; digest: number; ai: number };
  periodStart: string;
  periodEnd: string;
  nextBillingAt: string; // ISO
  scheduledChange: { planCode: PlanCode; cancel: boolean } | null;
  graceUntil: string | null;
  pocFreeUntil: string | null;
  pocActive: boolean;
  creditBalance: number;
  creditSoonExpire: { amount: number; at: string } | null;
  /** 각 상위 플랜으로의 즉시 업그레이드 정가 비례정산액(무PG면 실제 청구 0). */
  upgradeProration: Partial<Record<PlanCode, number>>;
}

export async function getMembershipView(
  userId: string,
  now: Date = new Date(),
): Promise<MembershipView> {
  await ensureMembership(userId, now); // 없으면 PoC 무료 Medium 생성
  const admin = createAdminClient();

  const { data: m } = await admin.from('membership').select('*').eq('user_id', userId).single();
  if (!m) throw new Error('membership not found');

  const planCode = m.plan_code as PlanCode;
  const plan = PLANS[planCode];

  // 현재 주기 사용량 + 활성 채널 수 + 크레딧 잔액(병렬).
  const [{ data: curRow }, { count: channelCount }, { data: grants }] = await Promise.all([
    admin
      .from('membership_usage')
      .select('digest_used, ai_query_used')
      .eq('user_id', userId)
      .eq('period_start', m.period_start)
      .maybeSingle(),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('active', true),
    admin
      .from('credit_grants')
      .select('remaining_amount, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', now.toISOString())
      .order('expires_at', { ascending: true }),
  ]);
  const digestUsed = curRow?.digest_used ?? 0;
  const aiUsed = curRow?.ai_query_used ?? 0;

  const creditBalance = (grants ?? []).reduce((s, g) => s + g.remaining_amount, 0);
  const soon = (grants ?? []).find(
    (g) => new Date(g.expires_at).getTime() < now.getTime() + 30 * 24 * 3600 * 1000,
  );

  const sched = (m.scheduled_change ?? null) as { plan_code?: string; cancel?: boolean } | null;

  // 상위 플랜 비례정산 미리보기(현재 주기·anchor 기준)
  const upgradeProration: Partial<Record<PlanCode, number>> = {};
  for (const code of PLAN_ORDER) {
    if (isUpgrade(planCode, code)) {
      upgradeProration[code] = computeProration(planCode, code, m.period_start, m.anchor_day, now).raw;
    }
  }

  return {
    planCode,
    planName: plan.name,
    price: plan.price,
    status: m.status,
    limits: { channel: plan.channelLimit, digest: plan.digestLimit, ai: plan.aiQueryLimit },
    usage: { channel: channelCount ?? 0, digest: digestUsed, ai: aiUsed },
    periodStart: m.period_start,
    periodEnd: m.period_end,
    nextBillingAt: m.next_billing_at,
    scheduledChange: sched?.plan_code
      ? { planCode: sched.plan_code as PlanCode, cancel: Boolean(sched.cancel) }
      : null,
    graceUntil: m.grace_until,
    pocFreeUntil: m.poc_free_until,
    pocActive: m.status === 'poc_free' && !!m.poc_free_until && now < new Date(m.poc_free_until),
    creditBalance,
    creditSoonExpire: soon ? { amount: soon.remaining_amount, at: soon.expires_at } : null,
    upgradeProration,
  };
}
