// 관제 홈 데이터 타입 — get_admin_overview() RPC 반환 형태(SSR §5.3).
// health 는 pipeline_health_snapshot() 재사용분.

export type BatchToday = {
  detected: number;
  summarized: number;
  delivered: number;
};

export type FailedRun = { kind: string; error: string; atKst: string };

export type HealthSnapshot = {
  nowKst: string;
  lastPipelineRunAgeMin: number | null;
  detectFailures: number;
  acquireFailed3h: number;
  cookieExpirySuspected: boolean;
  eligibleUnsummarized: number;
  deliveryFailures24h: number;
  failedRuns: FailedRun[];
  failedVideosPostCutoff: { count: number; samples: unknown[] };
  deadDataPending: number;
  today: BatchToday;
  summarizedRecentMedian: number;
};

export type SubscriberStats = {
  active: number;
  newLast7d: number;
  newLast30d: number;
};

export type OverviewData = {
  health: HealthSnapshot;
  subscribers: SubscriberStats;
};
