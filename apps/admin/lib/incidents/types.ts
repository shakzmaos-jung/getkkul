import type { HealthSnapshot } from '@/lib/overview/types';

export type RecentFailure = { kind: string; error: string; atKst: string };

export type IncidentLog = {
  health: HealthSnapshot;
  windowDays: number;
  recentFailures: RecentFailure[];
};
