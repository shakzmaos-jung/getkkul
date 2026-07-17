import type OpenAI from 'openai';
import { createPipelineClient } from '@/lib/pipeline/supabase';
import { defineTerms } from '@/lib/glossary/define-terms';
import type { Json } from '@/lib/database.types';

type SupabaseClient = ReturnType<typeof createPipelineClient>;

const BATCH = 30; // 한 런에 정의하는 신규 용어 상한

/**
 * `content_terms` 에 등장하나 `glossary_terms` 에 정의가 없는 용어만 배치로 정의해 전역 사전에 적재.
 * **이미 정의된 용어(관리자 수정 포함)는 스킵 → LLM 재호출 없음(비용 절감).** 파이프라인 stage.
 */
export async function defineGlossaryPending(
  deps: { supabase?: SupabaseClient; client?: OpenAI } = {},
): Promise<{ pending: number; defined: number }> {
  const supabase = deps.supabase ?? createPipelineClient();

  // 후보: 전 영상 content_terms 의 용어(플랫·중복제거).
  const { data: cts, error } = await supabase.from('content_terms').select('terms');
  if (error) throw new Error(`content_terms 조회 실패: ${error.message}`);
  const candidates = new Set<string>();
  for (const r of cts ?? []) {
    for (const t of r.terms ?? []) {
      const s = (t ?? '').trim();
      if (s) candidates.add(s);
    }
  }
  if (candidates.size === 0) return { pending: 0, defined: 0 };

  // 이미 등록된 표기(term_ko ∪ term_en, disabled 포함) 제외(재호출·부활 방지).
  const { data: gts, error: gErr } = await supabase.from('glossary_terms').select('term_ko, term_en');
  if (gErr) throw new Error(`glossary_terms 조회 실패: ${gErr.message}`);
  const defined = new Set<string>();
  for (const g of gts ?? []) {
    if (g.term_ko) defined.add(g.term_ko);
    if (g.term_en) defined.add(g.term_en);
  }

  const pending = [...candidates].filter((t) => !defined.has(t)).slice(0, BATCH);
  if (pending.length === 0) return { pending: 0, defined: 0 };

  const defs = await defineTerms(pending, { client: deps.client });
  if (defs.length === 0) return { pending: pending.length, defined: 0 };

  // define_glossary_terms RPC 는 {term_ko, term_en, definition} 배열을 받는다.
  const payload = defs.map((d) => ({ term_ko: d.termKo, term_en: d.termEn, definition: d.definition }));
  const { data: n, error: defErr } = await supabase.rpc('define_glossary_terms', {
    p_defs: payload as unknown as Json,
  });
  if (defErr) throw new Error(`용어 정의 저장 실패: ${defErr.message}`);
  return { pending: pending.length, defined: (n as number) ?? 0 };
}
