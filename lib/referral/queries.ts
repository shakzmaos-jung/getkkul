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
}

export interface CreditLedger {
  balance: number;
  expiringSoon: number;
  transactions: CreditTxnRow[];
}

/** 크레딧 원장: 잔액(로트 합)·곧 만료·트랜잭션 내역 (REQ-G1). */
export async function getCreditLedger(
  supabase: Client,
  userId: string,
  nowIso = new Date().toISOString(),
): Promise<CreditLedger> {
  const { data: grants } = await supabase
    .from('credit_grants')
    .select('id, remaining_amount, expires_at, granted_at')
    .eq('user_id', userId);
  const lots: CreditLot[] = (grants ?? []).map((g) => ({
    id: g.id,
    remaining: g.remaining_amount,
    expiresAt: g.expires_at,
    grantedAt: g.granted_at,
  }));

  const { data: txns } = await supabase
    .from('credit_transactions')
    .select('id, delta, kind, memo, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  return {
    balance: computeBalance(lots, nowIso),
    expiringSoon: expiringSoon(lots, nowIso),
    transactions: txns ?? [],
  };
}

export interface ReferralProgressRow {
  referral_id: string;
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
