import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import {
  summarizeAllModes,
  PROMPT_VERSION,
  type SummaryUsage,
  type DomainHint,
} from '@/lib/summary/summarize';
import {
  LENGTH_MODES,
  isProvided,
  longBodyToText,
  pointsToText,
  type LengthMode,
  type SummaryLanguage,
  type StructuredSummaries,
  type DepthCeiling,
} from '@/lib/summary/format';

/**
 * (video_id, length_mode, language) 요약 캐시 (요약품질 SSR 부록).
 * 있으면 재사용, 없으면 단일 호출로 3종 정보 계층 요약을 생성해 저장한다.
 * service_role 클라이언트를 주입받는다(파이프라인=pipeline client).
 *
 * 저장 구조:
 * - short/normal(제공): core_text + body {v}.
 * - long(제공): core_text = facts+insights 결합(QA·읽기시간 호환), body {facts, insights, v}.
 * - 제공 안 함(depthCeiling 초과, AC-C1.3): core_text='' + body {notProvided:true, ceiling, v}.
 */
type DB = SupabaseClient<Database>;

export interface BatchSummaryResult {
  generated: number; // 이번에 새로 생성·저장한 모드 수(0 = 전부 캐시)
  usage: SummaryUsage | null; // LLM 미호출(전부 캐시)이면 null
}

type SummaryRow = Database['public']['Tables']['summaries']['Insert'];

/** 보수적 용어 교정용 채널 도메인 힌트를 best-effort 로 조립한다(REQ-D1, 실패해도 요약은 진행). */
async function loadDomainHint(
  supabase: DB,
  channelId: string,
  videoTitle: string | null,
  videoId: string,
): Promise<DomainHint> {
  const hint: DomainHint = { videoTitle };
  try {
    const cat = await supabase
      .from('channel_catalog')
      .select('title')
      .eq('channel_id', channelId)
      .maybeSingle();
    hint.channelTitle = cat.data?.title ?? null;
    if (!hint.channelTitle) {
      const sub = await supabase
        .from('subscriptions')
        .select('channel_title')
        .eq('channel_id', channelId)
        .not('channel_title', 'is', null)
        .limit(1)
        .maybeSingle();
      hint.channelTitle = sub.data?.channel_title ?? null;
    }
    const terms = await supabase
      .from('content_terms')
      .select('terms')
      .eq('video_id', videoId)
      .maybeSingle();
    if (Array.isArray(terms.data?.terms) && terms.data!.terms.length > 0) {
      hint.terms = terms.data!.terms;
    }
  } catch (e) {
    console.warn(`[summarize] 도메인 힌트 조회 실패(무시): ${(e as Error).message}`);
  }
  return hint;
}

/** 구조화 결과 + ceiling 으로 특정 모드의 저장 row 를 만든다. */
function rowFor(
  videoId: string,
  mode: LengthMode,
  language: SummaryLanguage,
  s: StructuredSummaries,
  ceiling: DepthCeiling,
): SummaryRow {
  const base = { video_id: videoId, length_mode: mode, language, prompt_version: PROMPT_VERSION };
  if (!isProvided(mode, ceiling)) {
    return {
      ...base,
      headline: '',
      core_text: '',
      body: { notProvided: true, ceiling, modelCeiling: s.depthCeiling, v: PROMPT_VERSION } as unknown as Json,
    };
  }
  if (mode === 'long') {
    return {
      ...base,
      headline: s.long.headline,
      core_text: longBodyToText(s.long),
      body: { facts: s.long.facts, insights: s.long.insights, modelCeiling: s.depthCeiling, v: PROMPT_VERSION } as unknown as Json,
    };
  }
  return {
    ...base,
    headline: s[mode].headline,
    core_text: pointsToText(s[mode].points),
    body: { points: s[mode].points, modelCeiling: s.depthCeiling, v: PROMPT_VERSION } as unknown as Json,
  };
}

/**
 * (video_id, language) 의 short/normal/long 3종을 확보한다 — REQ-CO1.
 * 누락 모드가 있으면 전사를 1회만 전송하는 단일 호출로 3종을 생성해 누락분만 저장한다
 * (기존행 보존, UNIQUE 충돌은 ignoreDuplicates 로 무해). 3종 모두 있으면 LLM 호출 0.
 */
export async function getOrCreateSummaries(
  supabase: DB,
  videoId: string,
  language: SummaryLanguage,
  deps: { client?: OpenAI } = {},
): Promise<BatchSummaryResult> {
  const existing = await supabase
    .from('summaries')
    .select('length_mode')
    .eq('video_id', videoId)
    .eq('language', language);
  if (existing.error) throw new Error(`요약 조회 실패: ${existing.error.message}`);
  const have = new Set((existing.data ?? []).map((r) => r.length_mode));
  const missing = LENGTH_MODES.filter((m) => !have.has(m));
  if (missing.length === 0) return { generated: 0, usage: null }; // 조회 경로 LLM 0

  const video = await supabase
    .from('videos')
    .select('transcript, status, title, channel_id')
    .eq('id', videoId)
    .single();
  if (video.error) throw new Error(`영상 조회 실패: ${video.error.message}`);
  if (video.data.status !== 'done' || !video.data.transcript) {
    throw new Error(`전사가 준비되지 않은 영상: ${videoId}`);
  }

  const hint = await loadDomainHint(supabase, video.data.channel_id, video.data.title, videoId);
  const { structured, ceiling, usage, terms, corrections } = await summarizeAllModes(
    video.data.transcript,
    language,
    deps,
    { hint },
  );

  // 관측성: 모델 원본 depthCeiling(해소 전) 경보 — short/normal 판정을 파이프라인 로그로 감지(재발 추적용, 판정엔 관여 안 함).
  if (structured.depthCeiling !== 'long') {
    console.warn(
      `[summarize] depthCeiling=${structured.depthCeiling} resolved=${ceiling} video=${videoId} lang=${language} transcript_len=${video.data.transcript.length}`,
    );
  }

  const rows = missing.map((m) => rowFor(videoId, m, language, structured, ceiling));
  const inserted = await supabase
    .from('summaries')
    .upsert(rows, { onConflict: 'video_id,length_mode,language', ignoreDuplicates: true });
  if (inserted.error) throw new Error(`요약 저장 실패: ${inserted.error.message}`);

  // 추출 용어를 content_terms 에 저장(처리시점 사전계산, ko). 도메인 힌트·전역 용어사전의 시드.
  if (language === 'ko' && terms.length > 0) {
    const ct = await supabase
      .from('content_terms')
      .upsert({ video_id: videoId, terms }, { onConflict: 'video_id' });
    if (ct.error) console.warn(`[summarize] content_terms 저장 실패(무시): ${ct.error.message}`);
  }

  // 자막 오인식 용어 교정 로그 적재(ko, 처리시점). 실패해도 요약은 유지(격리 — 어드민 조회 데이터원).
  if (language === 'ko' && corrections.length > 0) {
    const cr = await supabase.rpc('record_term_corrections', {
      p_video_id: videoId,
      p_items: corrections as unknown as Json,
    });
    if (cr.error) console.warn(`[summarize] term_corrections 적재 실패(무시): ${cr.error.message}`);
  }

  return { generated: missing.length, usage };
}
