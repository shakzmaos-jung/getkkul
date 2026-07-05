import { createPipelineClient } from '@/lib/pipeline/supabase';
import { getOrCreateSummary } from '@/lib/summary/get-or-create-summary';
import { LENGTH_MODES } from '@/lib/summary/format';

/**
 * done 영상에 대해 모든 길이 모드(짧게/보통/길게) × 한국어 요약을 미리 생성·캐시한다
 * (SSR AC-E1.1: 감지 시점에 요약, AC-D2.3: 모드별 1회). 다이제스트에서 길이 전환이 즉시 되도록
 * 3개 모드를 모두 준비한다. 이미 캐시된 것은 API 호출 없이 통과. 개별 실패는 전체를 막지 않는다(H6).
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface SummarizeResult {
  videos: number;
  generated: number;
}

export async function summarizePending(
  deps: { supabase?: SupabaseClient; limit?: number } = {},
): Promise<SummarizeResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const limit = deps.limit ?? 50;

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id')
    .eq('status', 'done')
    .limit(limit);
  if (error) throw new Error(`done 영상 조회 실패: ${error.message}`);

  let generated = 0;
  for (const v of videos ?? []) {
    for (const mode of LENGTH_MODES) {
      try {
        const r = await getOrCreateSummary(supabase, v.id, mode, 'ko');
        if (!r.cached) generated++;
      } catch (e) {
        console.warn(`[summarize] ${v.id} (${mode}) 실패: ${(e as Error).message}`);
      }
    }
  }

  return { videos: (videos ?? []).length, generated };
}
