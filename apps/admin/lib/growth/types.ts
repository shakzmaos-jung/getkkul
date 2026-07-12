// 그로스 데이터 타입 — get_growth_metrics RPC 반환 형태.
export type GrowthSubscribers = {
  active: number;
  newLast7d: number;
  newLast30d: number;
  totalSignups: number;
};
export type GrowthFunnel = { signedUp: number; subscribed: number; delivered: number };
export type GrowthActivation = { signups: number; delivered: number; rate: number | null };
export type GrowthCohort = {
  week: string;
  size: number;
  stillActive: number;
  retentionRate: number | null;
};
export type GrowthReferral = {
  totalIssued: number;
  budgetCap: number;
  perUserCap: number;
  rewardAmount: number;
  active: boolean;
  totalReferrals: number;
  activated: number;
  soakRate: number | null;
};
export type GrowthMetrics = {
  subscribers: GrowthSubscribers;
  funnel: GrowthFunnel;
  activation: GrowthActivation;
  cohorts: GrowthCohort[];
  referral: GrowthReferral;
};
