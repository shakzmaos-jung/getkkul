'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { GlossaryRow, GlossaryHistoryRow } from './types';
import type { Json } from '@/lib/database.types';
import { toCsv, parseCsv } from './csv';

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
  aliases: string[],
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
    p_aliases: aliases,
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
  aliases: string[],
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
    p_aliases: aliases,
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

// CSV 컬럼(업로드 시 앞 6개만 반영: id 키 + 대표명·Alias·정의·메모. 뒤 4개는 참고용 읽기전용).
const CSV_HEADER = ['id', '대표(한글)', '대표(영어)', 'Alias', '정의', '메모', '출처', '상태', '수정자', '수정일'];

/** 현재 필터의 전체 결과를 CSV 문자열로(다운로드용). */
export async function exportGlossaryCsv(q: {
  source?: string;
  status?: string;
  search?: string;
}): Promise<{ ok: boolean; csv?: string; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: '관리자 권한이 필요합니다.' };
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_glossary', {
    p_source: q.source ?? null,
    p_status: q.status ?? null,
    p_search: q.search ?? null,
    p_limit: 100000,
    p_offset: 0,
  });
  if (error || !data) return { ok: false, error: error?.message ?? '조회에 실패했습니다.' };
  const raw = data as unknown as { rows: GlossaryRow[] };
  const rows = raw.rows.map((r) => [
    r.id,
    r.termKo ?? '',
    r.termEn ?? '',
    (r.aliases ?? []).join('; '),
    r.definition ?? '',
    r.note ?? '',
    r.source,
    r.disabled ? '일시정지' : '사용중',
    r.editorEmail ? maskEmail(r.editorEmail) : '',
    r.updatedAtKst,
  ]);
  return { ok: true, csv: toCsv([CSV_HEADER, ...rows]) };
}

/** CSV 업로드 → id 기준 대표명·Alias·정의·메모 일괄 갱신(변경분만 수정일 갱신). */
export async function importGlossaryCsv(csvText: string): Promise<{
  ok: boolean;
  updated?: number;
  unchanged?: number;
  missing?: number;
  skipped?: number;
  error?: string;
}> {
  const g = await gate();
  if (!g.ok) return g;
  const table = parseCsv(csvText);
  if (table.length < 2) return { ok: false, error: 'CSV 데이터가 없습니다.' };
  const header = table[0].map((h) => h.trim());
  const at = (row: string[], name: string) => {
    const i = header.indexOf(name);
    return i >= 0 ? (row[i] ?? '') : '';
  };
  if (header.indexOf('id') < 0 || (header.indexOf('대표(한글)') < 0 && header.indexOf('대표(영어)') < 0)) {
    return { ok: false, error: "CSV 헤더에 'id'와 대표명 컬럼이 필요합니다." };
  }
  const rows = table.slice(1).map((row) => ({
    id: at(row, 'id').trim(),
    term_ko: at(row, '대표(한글)'),
    term_en: at(row, '대표(영어)'),
    aliases: at(row, 'Alias')
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    definition: at(row, '정의'),
    note: at(row, '메모'),
  }));
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('import_glossary_csv', {
    p_rows: rows as unknown as Json,
    p_editor: g.editor,
  });
  if (error || !data) return { ok: false, error: error?.message ?? '업로드에 실패했습니다.' };
  const r = data as { updated: number; unchanged: number; missing: number; skipped: number };
  revalidatePath('/glossary');
  return { ok: true, ...r };
}
