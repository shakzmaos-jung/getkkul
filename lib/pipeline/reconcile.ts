import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchChannelUploadsPaged } from '@/lib/youtube/channel-uploads';
import type { Json } from '@/lib/database.types';

/**
 * 자가치유 보정 백필 (pipeline-reliability REQ-E/G2). WebSub·폴링이 놓친 영상까지 회복해
 * 누락률을 0으로 수렴시킨다. 채널별 업로드 재생목록을 15개 창 너머까지(pageToken) 훑어
 * 미등록분을 pending 으로 upsert(멱등). 무겁고 하루 1회면 충분하므로 20시간 셀프 게이트.
 */
const RECONCILE_INTERVAL_MS = 20 * 60 * 60 * 1000; // 하루 1회 목표
const BACKFILL_PAGES = 3; // ≈150개 업로드까지

type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface ReconcileResult {
  ran: boolean;
  channels: number;
  backfilled: number;
  failed: number;
}

export async function reconcileChannels(
  deps: {
    supabase?: SupabaseClient;
    fetchFn?: typeof fetch;
    nowMs?: number;
    force?: boolean;
  } = {},
): Promise<ReconcileResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const now = deps.nowMs ?? Date.now();

  // 셀프 게이트: 최근 20시간 내 보정이 있었으면 스킵(파이프라인이 자주 돌아도 하루 1회만).
  if (!deps.force) {
    const since = new Date(now - RECONCILE_INTERVAL_MS).toISOString();
    const { data: recent } = await supabase
      .from('pipeline_runs')
      .select('id')
      .eq('kind', 'reconcile')
      .gte('finished_at', since)
      .limit(1);
    if (recent && recent.length > 0) {
      return { ran: false, channels: 0, backfilled: 0, failed: 0 };
    }
  }

  const { data: subs } = await supabase.from('subscriptions').select('channel_id');
  const channels = [...new Set((subs ?? []).map((s) => s.channel_id))];

  const startedAt = new Date(now).toISOString();
  let backfilled = 0;
  let failed = 0;

  for (const ch of channels) {
    try {
      const vids = await fetchChannelUploadsPaged(ch, BACKFILL_PAGES, { fetchFn: deps.fetchFn });
      if (vids.length === 0) continue;
      const rows = vids.map((v) => ({
        channel_id: ch,
        video_id: v.videoId,
        title: v.title,
        url: v.url,
        published_at: v.publishedAt || null,
        status: 'pending' as const,
      }));
      const { data: inserted } = await supabase
        .from('videos')
        .upsert(rows, { onConflict: 'video_id', ignoreDuplicates: true })
        .select('video_id');
      backfilled += (inserted ?? []).length;
    } catch (e) {
      failed++;
      console.warn(`[reconcile] ${ch}: ${(e as Error).message}`);
    }
  }

  // 이번 보정 기록(다음 게이트 기준). recordRun 을 안 쓰고 직접 기록해 no-op 은 남기지 않는다.
  const stats = { ran: true, channels: channels.length, backfilled, failed } as unknown as Json;
  await supabase.from('pipeline_runs').insert({
    kind: 'reconcile',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    stats,
    ok: failed === 0,
  });

  return { ran: true, channels: channels.length, backfilled, failed };
}
