import type { Database } from '@/lib/database.types';

/** 표시용 원화 포맷. */
export function formatWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

type TxnKind = Database['public']['Enums']['credit_txn_kind'];

/** 트랜잭션 종류 라벨(원장 표시, AC-G1.2). */
export const TXN_KIND_LABEL: Record<TxnKind, string> = {
  grant: '적립',
  usage: '사용',
  expiry: '만료',
  forfeit: '소멸',
};

type ReferralStatus = Database['public']['Enums']['referral_status'];

/** 추천 상태 라벨(현황 표시, AC-G2.1). */
export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: '진행 중',
  activated: '지급 완료',
  void: '무효',
};
