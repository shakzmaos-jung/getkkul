'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { GlossaryHistoryRow } from './types';

/**
 * 용어 정의 수정(어드민 큐레이션). requireAdmin 게이트 → edit_glossary_term RPC(원자적: 정의 갱신 +
 * source='admin' + updated_by + 이력 기록). 어드민의 최초 WRITE.
 */
export async function updateGlossaryDefinition(
  term: string,
  definition: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: '관리자 권한이 필요합니다.' };
  }
  const def = definition.trim();
  if (!term || !def) return { ok: false, error: '정의를 입력하세요.' };

  // 편집자 식별(본인 세션) — anon 클라이언트로 자기 user id 취득(신뢰 가능한 주체).
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc('edit_glossary_term', {
    p_term: term,
    p_definition: def,
    p_editor: user.id,
  });
  if (error) return { ok: false, error: `저장 실패: ${error.message}` };
  revalidatePath('/glossary');
  return { ok: true };
}

/** 특정 용어의 수정 이력(등록/수정자·일시). 다이얼로그에서 지연 조회. 이메일 마스킹. */
export async function fetchGlossaryHistoryAction(term: string): Promise<GlossaryHistoryRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_glossary_history', { p_term: term });
  if (error || !data) return [];
  const rows = data as unknown as GlossaryHistoryRow[];
  return rows.map((r) => ({ ...r, editorEmail: r.editorEmail ? maskEmail(r.editorEmail) : null }));
}
