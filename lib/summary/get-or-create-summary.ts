import type OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { summarize, summarizeAllModes, type SummaryUsage } from '@/lib/summary/summarize';
import { LENGTH_MODES, type LengthMode, type SummaryLanguage, type Summary } from '@/lib/summary/format';

/**
 * (video_id, length_mode, language) 요약 캐시 (SSR AC-D2.3, D3.2).
 * 있으면 재사용, 없으면 생성 후 저장. 서로 다른 사용자가 같은 채널을 봐도 (모드,언어)별 1회만 연산.
 * service_role 클라이언트를 주입받는다(파이프라인=pipeline client, 웹 영어전환=admin client).
 */
type DB = SupabaseClient<Database>;

export interface CachedSummary extends Summary {
  cached: boolean;
}

export async function getOrCreateSummary(
  supabase: DB,
  videoId: string,
  mode: LengthMode,
  language: SummaryLanguage,
  deps: { client?: OpenAI } = {},
): Promise<CachedSummary> {
  // 1) 캐시 조회
  const existing = await supabase
    .from('summaries')
    .select('headline, core_text, body')
    .eq('video_id', videoId)
    .eq('length_mode', mode)
    .eq('language', language)
    .maybeSingle();
  if (existing.data) {
    return toSummary(existing.data, true);
  }

  // 2) 전사 확보 검증 (AC-D1.2: 전사가 있는 영상만)
  const video = await supabase
    .from('videos')
    .select('transcript, status')
    .eq('id', videoId)
    .single();
  if (video.error) throw new Error(`영상 조회 실패: ${video.error.message}`);
  if (video.data.status !== 'done' || !video.data.transcript) {
    throw new Error(`전사가 준비되지 않은 영상: ${videoId}`);
  }

  // 3) 생성
  const summary = await summarize(video.data.transcript, mode, language, deps);

  // 4) 저장 (race 는 UNIQUE 로 방지 — 충돌 시 캐시 재조회)
  const inserted = await supabase.from('summaries').insert({
    video_id: videoId,
    length_mode: mode,
    language,
    headline: summary.headline,
    core_text: summary.coreText,
    body: { bullets: summary.bullets },
  });

  if (inserted.error) {
    if (inserted.error.code === '23505') {
      const raced = await supabase
        .from('summaries')
        .select('headline, core_text, body')
        .eq('video_id', videoId)
        .eq('length_mode', mode)
        .eq('language', language)
        .single();
      if (raced.data) return toSummary(raced.data, true);
    }
    throw new Error(`요약 저장 실패: ${inserted.error.message}`);
  }

  return { ...summary, cached: false };
}

export interface BatchSummaryResult {
  generated: number; // 이번에 새로 생성·저장한 모드 수(0 = 전부 캐시)
  usage: SummaryUsage | null; // LLM 미호출(전부 캐시)이면 null
}

/**
 * (video_id, language) 의 short/normal/long 3종을 확보한다 — REQ-CO1.
 * 이미 있는 모드는 재사용하고, 누락 모드가 있으면 전사를 1회만 전송하는 단일 호출로 3종을 생성해
 * 누락분만 저장한다(기존행 보존, UNIQUE 충돌은 ignoreDuplicates 로 무해). 3종 모두 있으면 LLM 호출 0.
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
  if (missing.length === 0) return { generated: 0, usage: null }; // 조회 경로 LLM 0 (AC-CO1.4)

  const video = await supabase
    .from('videos')
    .select('transcript, status')
    .eq('id', videoId)
    .single();
  if (video.error) throw new Error(`영상 조회 실패: ${video.error.message}`);
  if (video.data.status !== 'done' || !video.data.transcript) {
    throw new Error(`전사가 준비되지 않은 영상: ${videoId}`);
  }

  const { summaries, usage } = await summarizeAllModes(video.data.transcript, language, deps);

  const rows = missing.map((m) => ({
    video_id: videoId,
    length_mode: m,
    language,
    headline: summaries[m].headline,
    core_text: summaries[m].coreText,
    body: { bullets: summaries[m].bullets },
  }));
  const inserted = await supabase
    .from('summaries')
    .upsert(rows, { onConflict: 'video_id,length_mode,language', ignoreDuplicates: true });
  if (inserted.error) throw new Error(`요약 저장 실패: ${inserted.error.message}`);

  return { generated: missing.length, usage };
}

function toSummary(
  row: { headline: string | null; core_text: string | null; body: unknown },
  cached: boolean,
): CachedSummary {
  const bullets =
    row.body && typeof row.body === 'object' && 'bullets' in row.body
      ? ((row.body as { bullets?: unknown }).bullets as string[]) ?? []
      : [];
  return {
    headline: row.headline ?? '',
    coreText: row.core_text ?? '',
    bullets: Array.isArray(bullets) ? bullets : [],
    cached,
  };
}
