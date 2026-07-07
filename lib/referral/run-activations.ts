import { createPipelineClient } from '@/lib/pipeline/supabase';
import { createNotifier } from '@/lib/notify/create-notifier';
import { createPushNotifier } from '@/lib/notify/create-push-notifier';
import type { Notifier } from '@/lib/notify/notify';
import type { PushNotifier } from '@/lib/notify/web-push';
import { computeBalance, type CreditLot } from './credit';
import { renderAwardEmail, renderAwardPush, type AwardSourceType } from './award-notify';

/**
 * 추천 활성화 스윕 (REQ-C/D/H). 발송 파이프라인 뒤에 호출한다.
 * pending referral 을 훑어 activate_and_award(원자)로 활성화·양방향 지급을 시도하고,
 * 실제 지급된 수령자에게 지급 알림(이메일/푸시)을 보낸다. 개별 referral 실패가 전체를 막지 않는다.
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface RunActivationsResult {
  pending: number;
  activated: number; // 지급이 1건이라도 발생한 referral 수
  grantsIssued: number;
  emailsSent: number;
  pushSent: number;
  failed: number;
}

export async function runReferralActivations(
  deps: {
    supabase?: SupabaseClient;
    notifier?: Notifier;
    pushNotifier?: PushNotifier | null;
    nowIso?: string;
  } = {},
): Promise<RunActivationsResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const notifier = deps.notifier ?? createNotifier();
  const pushNotifier =
    deps.pushNotifier !== undefined ? deps.pushNotifier : createPushNotifier();
  const nowIso = deps.nowIso ?? new Date().toISOString();
  const appBaseUrl = process.env.APP_BASE_URL;

  const { data: pendings, error } = await supabase
    .from('referrals')
    .select('referee_user_id')
    .eq('status', 'pending');
  if (error) throw new Error(`pending referral 조회 실패: ${error.message}`);

  let activated = 0;
  let grantsIssued = 0;
  let emailsSent = 0;
  let pushSent = 0;
  let failed = 0;

  for (const row of pendings ?? []) {
    try {
      const { data: awarded, error: rpcErr } = await supabase.rpc('activate_and_award', {
        p_referee: row.referee_user_id,
      });
      if (rpcErr) {
        failed++;
        console.warn(`[referral] activate_and_award 실패: ${rpcErr.message}`);
        continue;
      }
      if (!awarded || awarded.length === 0) continue; // 미충족(pending 유지) 또는 무지급

      activated++;
      grantsIssued += awarded.length;
      for (const g of awarded) {
        const r = await notifyRecipient(
          supabase,
          notifier,
          pushNotifier,
          { appBaseUrl, nowIso },
          g.award_user_id,
          g.award_amount,
          g.award_source as AwardSourceType,
        );
        if (r.email) emailsSent++;
        if (r.push) pushSent++;
      }
    } catch (e) {
      failed++;
      console.warn(`[referral] 활성화 처리 실패: ${(e as Error).message}`);
    }
  }

  return { pending: (pendings ?? []).length, activated, grantsIssued, emailsSent, pushSent, failed };
}

/** 지급 수령자 1명에게 이메일 + 푸시로 알린다. 각각 격리(한쪽 실패가 다른 쪽/전체를 막지 않음). */
async function notifyRecipient(
  supabase: SupabaseClient,
  notifier: Notifier,
  pushNotifier: PushNotifier | null,
  ctx: { appBaseUrl?: string; nowIso: string },
  userId: string,
  amount: number,
  sourceType: AwardSourceType,
): Promise<{ email: boolean; push: boolean }> {
  const [{ data: profile }, { data: setting }, { data: grants }] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', userId).maybeSingle(),
    supabase.from('user_settings').select('delivery_email').eq('user_id', userId).maybeSingle(),
    supabase
      .from('credit_grants')
      .select('id, remaining_amount, expires_at, granted_at')
      .eq('user_id', userId),
  ]);

  const lots: CreditLot[] = (grants ?? []).map((g) => ({
    id: g.id,
    remaining: g.remaining_amount,
    expiresAt: g.expires_at,
    grantedAt: g.granted_at,
  }));
  const input = {
    amount,
    sourceType,
    balance: computeBalance(lots, ctx.nowIso),
    appBaseUrl: ctx.appBaseUrl,
  };

  let email = false;
  let push = false;

  const to = setting?.delivery_email ?? profile?.email ?? null;
  if (to) {
    try {
      await notifier.send({ email: to }, renderAwardEmail(input));
      email = true;
    } catch (e) {
      console.warn(`[referral] 지급 이메일 실패(${userId}): ${(e as Error).message}`);
    }
  }

  if (pushNotifier) {
    try {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);
      if (subs && subs.length > 0) {
        const results = await pushNotifier.send(subs, renderAwardPush(input));
        const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
        if (gone.length > 0) await supabase.from('push_subscriptions').delete().in('endpoint', gone);
        push = results.some((r) => r.ok);
      }
    } catch (e) {
      console.warn(`[referral] 지급 푸시 실패(${userId}): ${(e as Error).message}`);
    }
  }

  return { email, push };
}
