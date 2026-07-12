// 파이프라인 모듈 데이터 타입 — get_pipeline_status / get_channel_processing RPC 반환 형태.

export type StageKey = 'detect' | 'acquire' | 'summarize' | 'deliver';

export type PipelineStage = {
  key: StageKey;
  label: string;
  ok: boolean | null;
  durationSec: number | null; // 발송은 미기록 → null
  counts: Record<string, number>;
};

export type RetrySample = {
  title: string;
  lastError: string | null;
  failureKind: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  status: string;
};

export type RetryQueue = {
  dueNow: number;
  waiting: number;
  permanentFailures: number;
  exhaustedTransient: number;
  samples: RetrySample[];
};

export type PipelineStatus = {
  date: string;
  stages: PipelineStage[];
  retryQueue: RetryQueue;
};

export type ChannelRow = {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelHandle: string | null;
  new: number;
  summarized: number;
  pending: number;
  processing: number;
  failed: number;
};

export type ChannelProcessing = {
  cutoff: string;
  channels: ChannelRow[];
};
