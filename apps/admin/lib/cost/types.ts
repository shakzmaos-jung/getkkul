// 비용·쿼터 데이터 타입 — get_cost_breakdown RPC 반환 형태.
export type CostDaily = {
  day: string;
  promptTokens: number;
  completionTokens: number;
  calls: number;
};
export type CostTotals = {
  promptTokens: number;
  completionTokens: number;
  calls: number;
};
export type CostEmail = { sent: number; failed: number };
export type CostQuota = { day: string; unitsUsed: number; cap: number };

export type CostBreakdown = {
  model: string;
  from: string;
  to: string;
  daily: CostDaily[];
  totals: CostTotals;
  email: CostEmail;
  quota: CostQuota;
};
