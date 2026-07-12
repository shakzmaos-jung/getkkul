import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchVideoDurations } from '@/lib/youtube/fetch-durations';

type SupabaseClient = ReturnType<typeof createPipelineClient>;

/**
 * duration_seconds 가 NULL 인 영상을 YouTube Data API 로 채운다(best-effort, 배치 상한).
 * detect 의 취득이 종종 실패/누락돼 시간 미표시가 생기므로 파이프라인에서 self-heal 한다.
 * 라이브·삭제 등 실제 길이가 없는 영상은 계속 NULL(정상) — 소량이라 매 런 재시도해도 무해.
 *
 * 최신 발행순으로 처리한다(published_at desc): 최근 영상이 가장 관련성 높고 대개 채울 수 있어
 * 빨리 요약 대상이 되며, 채울 수 없는 오래된 영상(삭제·라이브)이 배치 앞을 막아 백로그가
 * 굶는 문제를 피한다. fetchVideoDurations 는 50개/호출로 배치하므로 200개 = 4유닛(쿼터 안전).
 */
export async function fillMissingDurations(
  deps: {
    supabase?: SupabaseClient;
    limit?: number;
    fetchDurations?: (ids: string[]) => Promise<Map<string, number>>;
  } = {},
): Promise<{ filled: number; targets: number }> {
  const supabase = deps.supabase ?? createPipelineClient();
  const limit = deps.limit ?? 200;
  const fetchDurations = deps.fetchDurations ?? fetchVideoDurations;

  const { data } = await supabase
    .from('videos')
    .select('video_id')
    .is('duration_seconds', null)
    // 최신 발행순 — 관련성·충전 가능성 높은 최근분 우선(오래된 미충전분이 앞을 막지 않게).
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  const ids = (data ?? []).map((r) => r.video_id);
  if (ids.length === 0) return { filled: 0, targets: 0 };

  const durations = await fetchDurations(ids);
  let filled = 0;
  for (const [videoId, sec] of durations) {
    const { error } = await supabase
      .from('videos')
      .update({ duration_seconds: sec })
      .eq('video_id', videoId);
    if (!error) filled++;
  }
  return { filled, targets: ids.length };
}
