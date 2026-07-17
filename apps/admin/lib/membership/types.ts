// 멤버십 이력(어드민) — get_membership_history RPC 반환. email 은 fetch 레이어에서 마스킹.
export type MembershipHistoryRow = {
  id: string;
  email: string | null; // 마스킹
  billingPeriod: string; // 'YYYY-MM-DD'
  planCode: string;
  amount: number; // 청구(정가)
  creditUsed: number; // 크레딧 결제액
  status: string; // billing_status
  memo: string | null;
  currentPlan: string | null;
  currentStatus: string | null;
  atKst: string;
};

export type MembershipHistory = { rows: MembershipHistoryRow[]; total: number };
