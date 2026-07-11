import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { generateReferralCode } from './code';
import { computeBalance, expiringSoon, type CreditLot } from './credit';

/**
 * 화면용 데이터 로더 (REQ-G). RLS 스코프 클라이언트(본인 행)로 호출한다.
 * 진행률은 정의자 함수 get_referral_progress 로 집계 수치만 가져온다(상세 비노출, AC-G2.2).
 */
type Client = SupabaseClient<Database>;

/** 사용자당 1개 추천 코드를 보장한다(최초 필요 시 생성, AC-A1.1). RLS: 본인 행 select/insert. */
export async function getOrCreateReferralCode(supabase: Client, userId: string): Promise<string> {
  const { data } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .maybeSingle();
  if (data?.code) return data.code;

  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const { data: ins, error } = await supabase
      .from('referral_codes')
      .insert({ user_id: userId, code })
      .select('code')
      .maybeSingle();
    if (!error && ins?.code) return ins.code;
    // 경합(unique user_id/code) → 이미 만들어졌는지 재확인.
    const { data: again } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();
    if (again?.code) return again.code;
  }
  throw new Error('추천 코드 생성에 실패했습니다.');
}

export interface CreditTxnRow {
  id: string;
  delta: number;
  kind: Database['public']['Enums']['credit_txn_kind'];
  memo: string | null;
  created_at: string;
  /** 적립(grant) 트랜잭션의 출처 referral id — 적립 내역 → 친구 초대 딥링크용(없으면 null). */
  sourceReferralId: string | null;
}

export interface CreditLedger {
  balance: number;
  expiringSoon: number;
  /** 지급받은 크레딧 건수(로트 수). */
  grantCount: number;
  /** 총 획득(지급 합) · 총 사용(사용 합). */
  totalEarned: number;
  totalUsed: number;
  transactions: CreditTxnRow[];
}

/** 트랜잭션에서 총 획득(kind=grant 합)·총 사용(kind=usage 절대합)을 집계한다(순수). */
export function computeCreditTotals(
  txns: Pick<CreditTxnRow, 'delta' | 'kind'>[],
): { totalEarned: number; totalUsed: number } {
  let totalEarned = 0;
  let totalUsed = 0;
  for (const t of txns) {
    if (t.kind === 'grant') totalEarned += t.delta;
    else if (t.kind === 'usage') totalUsed += Math.abs(t.delta);
  }
  return { totalEarned, totalUsed };
}

/** 크레딧 원장: 잔액(로트 합)·곧 만료·총획득/사용·트랜잭션 내역 (REQ-G1). */
export async function getCreditLedger(
  supabase: Client,
  userId: string,
  nowIso = new Date().toISOString(),
): Promise<CreditLedger> {
  const { data: grants } = await supabase
    .from('credit_grants')
    .select('id, remaining_amount, expires_at, granted_at, source_referral_id')
    .eq('user_id', userId);
  const lots: CreditLot[] = (grants ?? []).map((g) => ({
    id: g.id,
    remaining: g.remaining_amount,
    expiresAt: g.expires_at,
    grantedAt: g.granted_at,
  }));
  // grant_id → source_referral_id (적립 내역 딥링크).
  const refByGrant = new Map((grants ?? []).map((g) => [g.id, g.source_referral_id]));

  const { data: txns } = await supabase
    .from('credit_transactions')
    .select('id, delta, kind, memo, created_at, grant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  const transactions: CreditTxnRow[] = (txns ?? []).map((t) => ({
    id: t.id,
    delta: t.delta,
    kind: t.kind,
    memo: t.memo,
    created_at: t.created_at,
    sourceReferralId: t.grant_id ? (refByGrant.get(t.grant_id) ?? null) : null,
  }));

  return {
    balance: computeBalance(lots, nowIso),
    expiringSoon: expiringSoon(lots, nowIso),
    grantCount: lots.length,
    ...computeCreditTotals(transactions),
    transactions,
  };
}

export interface ReferralProgressRow {
  referral_id: string;
  referee_email: string | null;
  channel_count: number;
  summary_count: number;
  status: Database['public']['Enums']['referral_status'];
  created_at: string;
  activated_at: string | null;
}

/** 추천 현황: 피추천인별 진행률(채널/요약 카운트)·상태 (REQ-G2). 상세는 노출하지 않음(AC-G2.2). */
export async function getReferralProgress(supabase: Client): Promise<ReferralProgressRow[]> {
  const { data } = await supabase.rpc('get_referral_progress');
  return (data ?? []) as ReferralProgressRow[];
}
