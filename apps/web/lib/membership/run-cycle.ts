/**
 * 멤버십 주기 잡 (membership-spec §B/E/F/G). 결제일 도래·PoC 종료·유예 만료 전환을 적용하고,
 * 결제 성공/실패·PoC 종료·7일전 안내를 이메일+푸시로 보낸다. 하루 1회(cron) 호출, 멱등.
 */
// 파이프라인(GH Actions·Node)에서만 호출 — Next 전용 admin.ts('server-only')는 여기서 import 불가.
// tsx 가 'server-only' 를 못 찾아 파이프라인 전체가 로드 시 죽으므로 pipeline 전용 클라이언트를 쓴다.
import { createPipelineClient } from '@/lib/pipeline/supabase';
import { createNotifier } from '@/lib/notify/create-notifier';
import { createPushNotifier } from '@/lib/notify/create-push-notifier';
import { formatKst } from '@/lib/time';
import { planNextCycle, type MembershipState } from './cycle';
import { PLANS, type PlanCode } from './plans';
import { renderBillingEmail, renderBillingPush, type BillingNotifyInput } from './notify';

const APP = process.env.APP_BASE_URL;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type Admin = ReturnType<typeof createPipelineClient>;
type Notifier = ReturnType<typeof createNotifier>;
type PushNotifier = ReturnType<typeof createPushNotifier>;

/** 사용자 1명에게 이메일 + 푸시 알림(각각 격리). */
async function notifyUser(
  admin: Admin,
  notifier: Notifier,
  push: PushNotifier,
  userId: string,
  input: BillingNotifyInput,
): Promise<void> {
  try {
    const [{ data: profile }, { data: setting }] = await Promise.all([
      admin.from('profiles').select('email').eq('id', userId).maybeSingle(),
      admin.from('user_settings').select('delivery_email').eq('user_id', userId).maybeSingle(),
    ]);
    const to = setting?.delivery_email ?? profile?.email ?? null;
    if (to) await notifier.send({ email: to }, renderBillingEmail(input));
  } catch (e) {
    console.warn(`[membership] 이메일 실패(${userId}): ${(e as Error).message}`);
  }
  try {
    if (!push) return;
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);
    if (subs && subs.length > 0) {
      const results = await push.send(subs, renderBillingPush(input));
      const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
      if (gone.length > 0) await admin.from('push_subscriptions').delete().in('endpoint', gone);
    }
  } catch (e) {
    console.warn(`[membership] 푸시 실패(${userId}): ${(e as Error).message}`);
  }
}

export async function runMembershipCycle(
  now: Date = new Date(),
): Promise<{ transitions: number; warned: number }> {
  const admin = createPipelineClient();
  const notifier = createNotifier();
  const push = createPushNotifier();
  const nowIso = now.toISOString();

  // 전환 대상: 결제일 도래 OR PoC 종료 OR 유예 만료.
  const { data: due } = await admin
    .from('membership')
    .select(
      'user_id, plan_code, status, anchor_day, period_start, period_end, next_billing_at, scheduled_change, grace_until, poc_free_until',
    )
    .or(
      `next_billing_at.lte.${nowIso},and(status.eq.poc_free,poc_free_until.lte.${nowIso}),and(status.eq.grace,grace_until.lte.${nowIso})`,
    );

  let transitions = 0;
  for (const m of due ?? []) {
    const state: MembershipState = {
      planCode: m.plan_code as PlanCode,
      status: m.status,
      anchorDay: m.anchor_day,
      periodStart: m.period_start,
      periodEnd: m.period_end,
      nextBillingAt: m.next_billing_at,
      scheduledChange: (m.scheduled_change ?? null) as MembershipState['scheduledChange'],
      graceUntil: m.grace_until,
      pocFreeUntil: m.poc_free_until,
    };
    const action = planNextCycle(state, now);
    if (action.type === 'none') continue;

    if (action.type === 'poc_end') {
      await admin.rpc('membership_poc_end', { p_user: m.user_id });
      await notifyUser(admin, notifier, push, m.user_id, {
        event: 'poc_end',
        planName: PLANS[action.newPlan].name,
        appBaseUrl: APP,
      });
    } else {
      await admin.rpc('membership_advance_period', {
        p_user: m.user_id,
        p_new_plan: action.newPlan,
        p_new_status: action.newStatus,
        p_period_start: action.periodStart,
        p_period_end: action.periodEnd,
        p_next_billing: action.nextBillingAt,
        p_charge: action.charge,
        p_billing_status: action.billingStatus,
        p_channel_limit: action.channelLimit,
        p_idem: `${m.user_id}:${action.billingPeriod}`,
        p_clear_poc: action.clearPoc,
      });
      // PoC 무료 갱신(poc_free 유지)은 무소음. 실제 전환만 알림(성공/해지/유예).
      if (action.newStatus !== 'poc_free') {
        await notifyUser(admin, notifier, push, m.user_id, {
          event: action.newPlan === 'free' ? 'downgraded_free' : action.billingStatus === 'grace' ? 'grace_failed' : 'renewed',
          planName: PLANS[action.newPlan].name,
          nextBillingText: formatKst(action.nextBillingAt),
          appBaseUrl: APP,
        });
      }
    }
    transitions++;
  }

  // 멤버십 채널 한도 상시 시행: 전 사용자 구독중 채널을 플랜 한도 이하로 유지(초과분 자동 정지, 멱등).
  // 다운/업그레이드 이벤트뿐 아니라 "그냥 초과" 상태(POC 부여 등)도 매 주기 교정한다.
  await admin.rpc('membership_enforce_all_limits');

  // PoC 종료 7일 전 1회 안내(AC-F1.3/G1.3).
  const warnBefore = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();
  const { data: warnList } = await admin
    .from('membership')
    .select('user_id, plan_code, poc_free_until')
    .eq('status', 'poc_free')
    .eq('poc_warned', false)
    .not('poc_free_until', 'is', null)
    .lte('poc_free_until', warnBefore)
    .gt('poc_free_until', nowIso);

  let warned = 0;
  for (const m of warnList ?? []) {
    await notifyUser(admin, notifier, push, m.user_id, {
      event: 'poc_warning',
      planName: PLANS[m.plan_code as PlanCode].name,
      pocUntilText: m.poc_free_until ? formatKst(m.poc_free_until) : undefined,
      appBaseUrl: APP,
    });
    await admin.from('membership').update({ poc_warned: true }).eq('user_id', m.user_id);
    warned++;
  }

  return { transitions, warned };
}
