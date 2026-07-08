import { createPipelineClient } from '@/lib/pipeline/supabase';
import type { Json } from '@/lib/database.types';

/**
 * 파이프라인 실행 관측 (pipeline-reliability REQ-F1). 각 단계를 pipeline_runs 에 기록한다.
 * 기록 실패가 파이프라인을 막지 않도록 방어적으로(insert 실패는 로그만).
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

async function insertRun(
  supabase: SupabaseClient,
  kind: string,
  started_at: string,
  stats: Json,
  ok: boolean,
): Promise<void> {
  try {
    await supabase
      .from('pipeline_runs')
      .insert({ kind, started_at, finished_at: new Date().toISOString(), stats, ok });
  } catch (e) {
    console.warn(`[observability] pipeline_runs 기록 실패(${kind}): ${(e as Error).message}`);
  }
}

/** 한 단계(kind)를 실행하고 결과를 stats(jsonb)로 pipeline_runs 에 기록한 뒤 그대로 반환한다. */
export async function recordRun<T>(
  supabase: SupabaseClient,
  kind: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started_at = new Date().toISOString();
  try {
    const result = await fn();
    await insertRun(supabase, kind, started_at, (result ?? {}) as unknown as Json, true);
    return result;
  } catch (e) {
    await insertRun(supabase, kind, started_at, { error: (e as Error).message } as Json, false);
    throw e;
  }
}

/** 전체 파이프라인 1건 요약 기록(단계별 stats 취합). */
export async function recordPipelineRun(
  supabase: SupabaseClient,
  startedAt: string,
  stats: Json,
  ok: boolean,
): Promise<void> {
  await insertRun(supabase, 'pipeline', startedAt, stats, ok);
}
