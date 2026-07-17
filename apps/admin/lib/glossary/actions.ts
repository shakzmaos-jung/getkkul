'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { GlossaryHistoryRow } from './types';

type Result = { ok: boolean; error?: string };

/** 편집자 식별(본인 세션) — anon 클라로 자기 user id 취득(신뢰 가능한 주체). requireAdmin 후 호출. */
async function editorId(): Promise<string | null> {
  const authed = await createClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  return user?.id ?? null;
}

async function gate(): Promise<{ ok: true; editor: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: '관리자 권한이 필요합니다.' };
  }
  const editor = await editorId();
  if (!editor) return { ok: false, error: '로그인이 필요합니다.' };
  return { ok: true, editor };
}

const STATUS_MSG: Record<string, string> = {
  missing: '대상 용어를 찾을 수 없습니다.',
  missing_name: '한글 또는 영어 표기를 하나 이상 입력하세요.',
};

/** 신규 용어 등록(관리자). 한글/영어 중 하나 이상 필수. */
export async function addGlossaryTerm(
  termKo: string,
  termEn: string,
  definition: string,
  note: string,
): Promise<Result> {
  const g = await gate();
  if (!g.ok) return g;
  if (!termKo.trim() && !termEn.trim()) return { ok: false, error: STATUS_MSG.missing_name };
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('add_glossary_term', {
    p_term_ko: termKo,
    p_term_en: termEn,
    p_definition: definition,
    p_note: note,
    p_editor: g.editor,
  });
  if (error) return { ok: false, error: `등록 실패: ${error.message}` };
  if (!data) return { ok: false, error: STATUS_MSG.missing_name };
  revalidatePath('/glossary');
  return { ok: true };
}

/** 용어 수정(id 기준). 한글/영어/정의/메모. 추적필드 변경 시 source='admin'·이력. 메모는 이력 없음. */
export async function saveGlossaryTerm(
  id: string,
  termKo: string,
  termEn: string,
  definition: string,
  note: string,
): Promise<Result> {
  const g = await gate();
  if (!g.ok) return g;
  if (!termKo.trim() && !termEn.trim()) return { ok: false, error: STATUS_MSG.missing_name };
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('save_glossary_term', {
    p_id: id,
    p_term_ko: termKo,
    p_term_en: termEn,
    p_definition: definition,
    p_note: note,
    p_editor: g.editor,
  });
  if (error) return { ok: false, error: `저장 실패: ${error.message}` };
  if (data !== 'ok') return { ok: false, error: STATUS_MSG[data as string] ?? '저장에 실패했습니다.' };
  revalidatePath('/glossary');
  return { ok: true };
}

/** 일시 사용정지/해제. 정지 시 사용자 UI 툴팁에서 숨김(DB 유지). */
export async function setGlossaryDisabled(id: string, disabled: boolean): Promise<Result> {
  const g = await gate();
  if (!g.ok) return g;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('set_glossary_disabled', {
    p_id: id,
    p_disabled: disabled,
    p_editor: g.editor,
  });
  if (error) return { ok: false, error: `변경 실패: ${error.message}` };
  if (data !== 'ok') return { ok: false, error: STATUS_MSG[data as string] ?? '변경에 실패했습니다.' };
  revalidatePath('/glossary');
  return { ok: true };
}

/** 용어 삭제(이력 보존). 표기가 향후 재추출되면 파이프라인이 재생성할 수 있음(일시정지와 다름). */
export async function deleteGlossaryTerm(id: string): Promise<Result> {
  const g = await gate();
  if (!g.ok) return g;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('delete_glossary_term', { p_id: id, p_editor: g.editor });
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` };
  if (data !== 'ok') return { ok: false, error: STATUS_MSG[data as string] ?? '삭제에 실패했습니다.' };
  revalidatePath('/glossary');
  return { ok: true };
}

/** 특정 용어(id)의 수정 이력. 다이얼로그에서 지연 조회. 이메일 마스킹. */
export async function fetchGlossaryHistoryAction(termId: string): Promise<GlossaryHistoryRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_glossary_history', { p_term_id: termId });
  if (error || !data) return [];
  const rows = data as unknown as GlossaryHistoryRow[];
  return rows.map((r) => ({ ...r, editorEmail: r.editorEmail ? maskEmail(r.editorEmail) : null }));
}
