import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchVideoDurations } from '@/lib/youtube/fetch-durations';

/**
 * duration_seconds 가 NULL 인 영상을 YouTube Data API 로 채운다(best-effort, 배치 상한).
 * detect 의 취득이 종종 실패/누락돼 시간 미표시가 생기므로 파이프라인에서 self-heal 한다.
 * 라이브·삭제 등 실제 길이가 없는 영상은 계속 NULL(정상) — 소량이라 매 런 재시도해도 무해.
 */
export async function fillMissingDurations(
  deps: { limit?: number } = {},
): Promise<{ filled: number; targets: number }> {
  const supabase = createPipelineClient();
  const limit = deps.limit ?? 50;

  const { data } = await supabase
    .from('videos')
    .select('video_id')
    .is('duration_seconds', null)
    .limit(limit);
  const ids = (data ?? []).map((r) => r.video_id);
  if (ids.length === 0) return { filled: 0, targets: 0 };

  const durations = await fetchVideoDurations(ids);
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
