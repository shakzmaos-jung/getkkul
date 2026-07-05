import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchContent, type FetchedContent, type VideoRef } from '@/lib/pipeline/fetch-content';
import { withRetry } from '@/lib/pipeline/retry';
import { ytdlpCaption, whisperAudio } from '@/lib/pipeline/youtube-content';

/**
 * pending 영상의 전사 확보 (SSR REQ-C2). fetchContent 로 자막→오디오 폴백,
 * 최대 3회 백오프(AC-C2.4). 성공 시 done, 실패 시 failed 로 남기고 다음 영상으로 계속(H6/C2.3).
 */
export interface AcquireResult {
  processed: number;
  done: number;
  failed: number;
}

type SupabaseClient = ReturnType<typeof createPipelineClient>;

export async function acquireTranscripts(
  deps: {
    supabase?: SupabaseClient;
    fetchContentFn?: (v: VideoRef) => Promise<FetchedContent>;
    limit?: number;
    baseMs?: number;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<AcquireResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const limit = deps.limit ?? 40;
  const baseMs = deps.baseMs ?? 1000;
  const run =
    deps.fetchContentFn ??
    ((v: VideoRef) => fetchContent(v, { getCaption: ytdlpCaption, transcribeAudio: whisperAudio }));

  const { data: pending, error } = await supabase
    .from('videos')
    .select('id, video_id, url')
    .eq('status', 'pending')
    .order('published_at', { ascending: true, nullsFirst: true }) // 오래된 것부터(결정적)
    .limit(limit);
  if (error) throw new Error(`pending 조회 실패: ${error.message}`);

  let done = 0;
  let failed = 0;

  for (const v of pending ?? []) {
    await supabase.from('videos').update({ status: 'processing' }).eq('id', v.id);
    try {
      const result = await withRetry(
        () => run({ videoId: v.video_id, url: v.url ?? '' }),
        { attempts: 3, baseMs, sleep: deps.sleep },
      );
      await supabase
        .from('videos')
        .update({ transcript: result.transcript, transcript_source: result.source, status: 'done' })
        .eq('id', v.id);
      done++;
    } catch (e) {
      // 개별 실패는 전체를 막지 않는다 (H6). 발송 대상에서 제외(status=failed).
      await supabase
        .from('videos')
        .update({ status: 'failed', transcript_source: 'none' })
        .eq('id', v.id);
      failed++;
      console.warn(`[acquire] ${v.video_id} 실패: ${(e as Error).message}`);
    }
  }

  return { processed: (pending ?? []).length, done, failed };
}
