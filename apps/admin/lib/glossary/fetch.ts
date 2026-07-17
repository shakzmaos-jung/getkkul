import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { Glossary } from './types';
import type { ParsedGlossaryQuery } from './derive';

/** 용어사전 조회. editorEmail 원문은 이 함수 안에서만 다루고 maskEmail 로 마스킹해 반환. */
export async function fetchGlossary(q: ParsedGlossaryQuery): Promise<Glossary> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_glossary', {
    p_source: q.source ?? null,
    p_status: q.status ?? null,
    p_search: q.search ?? null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (error) throw new Error(`get_glossary 실패: ${error.message}`);
  if (!data) throw new Error('get_glossary 빈 응답');
  const raw = data as unknown as Glossary;
  return {
    total: raw.total,
    rows: raw.rows.map((r) => ({ ...r, editorEmail: r.editorEmail ? maskEmail(r.editorEmail) : null })),
  };
}
