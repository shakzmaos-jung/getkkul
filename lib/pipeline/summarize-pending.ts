import { createPipelineClient } from '@/lib/pipeline/supabase';
import { getOrCreateSummary } from '@/lib/summary/get-or-create-summary';
import type { LengthMode } from '@/lib/summary/format';

/**
 * done 영상에 대해 구독자가 쓰는 (모드) × 한국어 요약을 미리 생성·캐시한다
 * (SSR AC-E1.1: 감지 시점에 요약, AC-D2.3: 모드·언어별 1회). 영어는 웹 전환 시 온디맨드(D3).
 * 이미 캐시된 것은 API 호출 없이 통과. 개별 실패는 전체를 막지 않는다(H6).
 */
type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface SummarizeResult {
  videos: number;
  generated: number;
}

/** 해당 채널 구독자들이 설정한 요약 길이 모드 집합. */
async function neededModes(supabase: SupabaseClient, channelId: string): Promise<LengthMode[]> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('channel_id', channelId);
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (userIds.length === 0) return [];

  const { data: settings } = await supabase
    .from('user_settings')
    .select('summary_length')
    .in('user_id', userIds);
  return [...new Set((settings ?? []).map((s) => s.summary_length as LengthMode))];
}

export async function summarizePending(
  deps: { supabase?: SupabaseClient; limit?: number } = {},
): Promise<SummarizeResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const limit = deps.limit ?? 50;

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, channel_id')
    .eq('status', 'done')
    .limit(limit);
  if (error) throw new Error(`done 영상 조회 실패: ${error.message}`);

  let generated = 0;
  for (const v of videos ?? []) {
    const modes = await neededModes(supabase, v.channel_id);
    for (const mode of modes) {
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
