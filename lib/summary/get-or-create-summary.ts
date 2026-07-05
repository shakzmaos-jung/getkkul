import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { summarize } from '@/lib/summary/summarize';
import type { LengthMode, SummaryLanguage, Summary } from '@/lib/summary/format';

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
  deps: { client?: Anthropic } = {},
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
