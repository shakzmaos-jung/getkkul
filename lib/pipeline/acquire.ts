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
  const limit = deps.limit ?? 100;
  const baseMs = deps.baseMs ?? 1000;
  const run =
    deps.fetchContentFn ??
    ((v: VideoRef) => fetchContent(v, { getCaption: ytdlpCaption, transcribeAudio: whisperAudio }));

  // 이전 런이 타임아웃/중단으로 남긴 'processing' 을 회복한다(다시 pending 으로).
  // 워크플로 concurrency group(cancel-in-progress:false)로 런이 겹치지 않으므로,
  // 이 시점에 남은 processing 은 모두 지난 런의 미완료분 → 안전하게 재시도 대상으로 되돌린다.
  await supabase.from('videos').update({ status: 'pending' }).eq('status', 'processing');

  const { data: pending, error } = await supabase
    .from('videos')
    .select('id, video_id, url')
    .eq('status', 'pending')
    // 최신 영상 우선(사용자가 곧바로 보는 것). 폭주(감지 스케줄 지연)로 백로그가 쌓여도
    // 오늘 올라온 콘텐츠가 오래된 백로그 뒤에서 굶지 않도록 한다.
    .order('published_at', { ascending: false, nullsFirst: false })
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
