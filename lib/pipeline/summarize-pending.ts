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

  // done 영상 전체(최신순)와 이미 있는 ko 요약(video_id, mode)을 조회.
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id')
    .eq('status', 'done')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`done 영상 조회 실패: ${error.message}`);
  const doneList = videos ?? [];
  if (doneList.length === 0) return { videos: 0, generated: 0 };

  const { data: sums } = await supabase
    .from('summaries')
    .select('video_id, length_mode')
    .eq('language', 'ko');
  const modesByVideo = new Map<string, Set<string>>();
  for (const s of sums ?? []) {
    const set = modesByVideo.get(s.video_id) ?? new Set<string>();
    set.add(s.length_mode);
    modesByVideo.set(s.video_id, set);
  }

  // 3개 모드가 다 채워지지 않은(=미요약/부분요약) done 영상만 대상. 최신 우선, 배치 limit.
  const targets = doneList
    .filter((v) => (modesByVideo.get(v.id)?.size ?? 0) < LENGTH_MODES.length)
    .slice(0, limit);

  let generated = 0;
  for (const v of targets) {
    // 한 영상의 3개 모드는 서로 독립이라 병렬 생성(모드당 UNIQUE라 충돌 없음).
    const results = await Promise.all(
      LENGTH_MODES.map(async (mode) => {
        try {
          const r = await getOrCreateSummary(supabase, v.id, mode, 'ko');
          return !r.cached; // 새로 생성했으면 true
        } catch (e) {
          console.warn(`[summarize] ${v.id} (${mode}) 실패: ${(e as Error).message}`);
          return false;
        }
      }),
    );
    generated += results.filter(Boolean).length;
  }

  return { videos: targets.length, generated };
}
