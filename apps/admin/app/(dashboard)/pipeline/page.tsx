import { fetchPipelineStatus, fetchChannelProcessing } from '@/lib/pipeline/fetch';
import { StageTimeline, RetryQueue, ChannelTable } from '@/components/pipeline/widgets';
import type { PipelineStatus, ChannelProcessing } from '@/lib/pipeline/types';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  let status: PipelineStatus;
  let channels: ChannelProcessing;
  try {
    [status, channels] = await Promise.all([
      fetchPipelineStatus(),
      fetchChannelProcessing(),
    ]);
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">파이프라인 데이터를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
          <p className="mt-3 text-xs text-ink-tertiary">새로고침으로 재시도하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted">배치 타임라인 (감지→전사→요약→발송)</h2>
          <span className="text-xs text-ink-tertiary">{status.date}</span>
        </div>
        <StageTimeline stages={status.stages} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">재시도 큐</h2>
        <RetryQueue rq={status.retryQueue} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">채널별 처리 현황 (구독 채널)</h2>
        <ChannelTable data={channels} />
      </section>
    </div>
  );
}
