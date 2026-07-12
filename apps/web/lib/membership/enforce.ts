/**
 * 한도 집행 (membership-spec §D, server-only). 플랜 한도를 채널추가·AI질의에 적용한다.
 * 사용량 소비는 원자적 RPC(membership_try_consume)로, 채널은 활성 개수 카운트로 판정.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, type PlanCode } from './plans';
import { ensureMembership } from './service';

async function planContext(userId: string): Promise<{ plan: PlanCode; periodStart: string }> {
  await ensureMembership(userId);
  const admin = createAdminClient();
  const { data } = await admin
    .from('membership')
    .select('plan_code, period_start')
    .eq('user_id', userId)
    .single();
  return { plan: (data?.plan_code ?? 'free') as PlanCode, periodStart: data?.period_start ?? '' };
}

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
}

/** 채널 추가 가능 여부(수신중=paused=false 구독 수 < 채널 한도, AC-D1.1). 소비는 실제 insert 로. */
export async function checkChannelLimit(userId: string): Promise<LimitCheck> {
  const { plan } = await planContext(userId);
  const limit = PLANS[plan].channelLimit;
  const admin = createAdminClient();
  const { count } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('paused', false);
  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

/** AI 질의 1회 소비 시도(원자적, AC-D1.3). allowed=false 면 한도 초과. */
export async function consumeAiQuery(userId: string): Promise<LimitCheck> {
  const { plan, periodStart } = await planContext(userId);
  const limit = PLANS[plan].aiQueryLimit;
  const admin = createAdminClient();
  const { data: ok } = await admin.rpc('membership_try_consume', {
    p_user: userId,
    p_period: periodStart,
    p_kind: 'ai',
    p_limit: limit,
  });
  // 현재 사용량(표시용) 재조회
  const { data: usage } = await admin
    .from('membership_usage')
    .select('ai_query_used')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle();
  return { allowed: ok === true, used: usage?.ai_query_used ?? 0, limit };
}

/** AI 질의 남은 횟수(표시용, 소비 안 함). */
export async function aiQuotaRemaining(userId: string): Promise<LimitCheck> {
  const { plan, periodStart } = await planContext(userId);
  const limit = PLANS[plan].aiQueryLimit;
  const admin = createAdminClient();
  const { data: usage } = await admin
    .from('membership_usage')
    .select('ai_query_used')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .maybeSingle();
  const used = usage?.ai_query_used ?? 0;
  return { allowed: used < limit, used, limit };
}
