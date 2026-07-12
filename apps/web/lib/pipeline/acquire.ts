import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchContent, type FetchedContent, type VideoRef } from '@/lib/pipeline/fetch-content';
import { withRetry } from '@/lib/pipeline/retry';
import {
  ytdlpCaption,
  whisperAudio,
  getBotBlockCount,
  resetBotBlockCount,
} from '@/lib/pipeline/youtube-content';
import { supadataCaption } from '@/lib/pipeline/supadata';
import { planFailure, classifyFailure } from '@/lib/pipeline/retry-policy';
import { CONTENT_CUTOFF_PUBLISHED_AT } from '@/lib/pipeline/content-cutoff';

/**
 * 자막 획득 티어(REQ-C): yt-dlp 자막(무료·주경로) → 실패 시 Supadata 관리형 API(폴백, 키 있을 때만).
 * 둘 다 실패하면 fetchContent 가 오디오 STT(Whisper)로 넘어간다. 격리 유지(source 는 'caption').
 */
async function captionWithFallback(v: VideoRef): Promise<string | null> {
  return (await ytdlpCaption(v)) ?? (await supadataCaption(v));
}

/**
 * pending 영상의 전사 확보 (SSR REQ-C2, pipeline-reliability REQ-B).
 * fetchContent 로 자막→오디오 폴백, 한 영상당 최대 3회 백오프(AC-C2.4).
 * 성공 시 done. 실패 시 일시/영구를 분류해(REQ-B) 일시 실패는 next_retry_at 백오프로 pending 재큐,
 * 영구·최대초과는 종점 failed. 개별 실패가 전체를 막지 않는다(H6/C2.3).
 */
export interface AcquireResult {
  processed: number;
  done: number;
  failed: number; // 종점 failed (영구·최대초과)
  rescheduled: number; // 일시 실패로 재큐(next_retry_at)
  skipped: number; // 시간 예산 초과로 이번 런에서 처리 안 함(다음 런 이월)
  botBlocks: number; // 이번 런에서 관찰된 유튜브 봇차단 횟수(쿠키 만료 알림 판단용)
}

type SupabaseClient = ReturnType<typeof createPipelineClient>;

export async function acquireTranscripts(
  deps: {
    supabase?: SupabaseClient;
    fetchContentFn?: (v: VideoRef) => Promise<FetchedContent>;
    limit?: number;
    baseMs?: number;
    sleep?: (ms: number) => Promise<void>;
    nowIso?: string;
    budgetMs?: number; // 이 시간 지나면 남은 pending 은 다음 런으로 양보(요약 단계 굶김 방지)
    now?: () => number; // 예산 측정용 시계(주입 가능)
  } = {},
): Promise<AcquireResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const limit = deps.limit ?? 100;
  const baseMs = deps.baseMs ?? 1000;
  const nowIso = deps.nowIso ?? new Date().toISOString();
  // 전사 획득이 느린 백로그(자막 없는 오디오 전사)에 45분 잡 전체를 소진해 이후 단계
  // (fillDurations·summarize)가 매 런 굶던 문제를 막는다. 예산을 넘으면 루프를 중단하고
  // 나머지는 다음 런으로 넘긴다(개별 영상은 끝까지 처리 — 중도 절단 없음).
  const budgetMs = deps.budgetMs ?? 15 * 60_000;
  const nowMs = deps.now ?? (() => Date.now());
  const run =
    deps.fetchContentFn ??
    ((v: VideoRef) =>
      fetchContent(v, { getCaption: captionWithFallback, transcribeAudio: whisperAudio }));

  // 봇차단 카운터를 이 런 기준으로 초기화(모듈 전역이지만 런 경계에서 리셋 → 반복 호출에도 정확).
  resetBotBlockCount();

  // 이전 런이 타임아웃/중단으로 남긴 'processing' 을 회복한다(다시 pending 으로).
  // 워크플로 concurrency group(cancel-in-progress:false)로 런이 걹치지 않으므로,
  // 이 시점에 남은 processing 은 모두 지난 런의 미완료분 → 안전하게 재시도 대상으로 되돌린다.
  await supabase.from('videos').update({ status: 'pending' }).eq('status', 'processing');

  const { data: pending, error } = await supabase
    .from('videos')
    .select('id, video_id, url, retry_count')
    .eq('status', 'pending')
    // 재시도 큐 소비(AC-B1.2): 신규(next_retry_at NULL) + 도래한 재시도만.
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    // 멤버십 츐7오프(2026-07-10 KST) 이전 업로드는 비조회라 전사하지 않음(NULL 은 미상이라 통과).
    .or(`published_at.gte.${CONTENT_CUTOFF_PUBLISHED_AT},published_at.is.null`)
    // 최신 영상 우선(사용자가 곷바로 보는 것). 폭주로 백로그가 쌓여도 오늘 콘텐츠가 굶지 않도록.
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`pending 조회 실패: ${error.message}`);

  let done = 0;
  let failed = 0;
  let rescheduled = 0;
  let skipped = 0;

  const startedMs = nowMs();
  for (const v of pending ?? []) {
    if (nowMs() - startedMs > budgetMs) {
      // 시간 예산 도달 — 남은 pending 은 다음 런에서(요약 단계에 시간 양보).
      skipped = (pending ?? []).length - (done + failed + rescheduled);
      console.log(`[acquire] 시간 예산 도달 — 남은 ${skipped}건은 다음 런으로 이월`);
      break;
    }
    await supabase.from('videos').update({ status: 'processing' }).eq('id', v.id);
    try {
      const result = await withRetry(() => run({ videoId: v.video_id, url: v.url ?? '' }), {
        attempts: 3,
        baseMs,
        sleep: deps.sleep,
        // 영구 실패(오디오 초과·삭제 등)는 같은 런에서 재시도해도 낭비 → 즉시 종점 분류로.
        shouldRetry: (e) => classifyFailure((e as Error).message) !== 'permanent',
      });
      await supabase
        .from('videos')
        .update({
          transcript: result.transcript,
          transcript_source: result.source,
          status: 'done',
          next_retry_at: null,
          last_error: null,
        })
        .eq('id', v.id);
      done++;
    } catch (e) {
      // 일시/영구 분류 후 재큐 or 종점화(REQ-B).
      const plan = planFailure(v.retry_count ?? 0, (e as Error).message, nowIso);
      await supabase
        .from('videos')
        .update({
          status: plan.status,
          transcript_source: 'none',
          retry_count: plan.retry_count,
          failure_kind: plan.failure_kind,
          next_retry_at: plan.next_retry_at,
          last_error: plan.last_error,
        })
        .eq('id', v.id);
      if (plan.status === 'failed') failed++;
      else rescheduled++;
      console.warn(
        `[acquire] ${v.video_id} 실패(${plan.failure_kind}, ${plan.status}): ${(e as Error).message}`,
      );
    }
  }

  return {
    processed: done + failed + rescheduled,
    done,
    failed,
    rescheduled,
    skipped,
    botBlocks: getBotBlockCount(),
  };
}
