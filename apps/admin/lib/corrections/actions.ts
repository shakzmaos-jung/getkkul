'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { GlossarySourceRow } from '@/lib/glossary/types';

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
  missing: '대상 교정을 찾을 수 없습니다.',
  missing_corrected: '교정 표기를 입력하세요.',
  bad_form: '표기형(한글/영어/하이브리드)이 올바르지 않습니다.',
};

/**
 * 자동 교정 결과를 관리자가 수정(교정 표기·표기형·메모). 저장 시 method='admin' 로 승격되어
 * 파이프라인 재적재 시 덮이지 않는다. 메모는 추후 교정 품질 향상 학습데이터.
 */
export async function saveCorrection(
  id: string,
  corrected: string,
  form: string,
  memo: string,
): Promise<Result> {
  const g = await gate();
  if (!g.ok) return g;
  if (!corrected.trim()) return { ok: false, error: STATUS_MSG.missing_corrected };
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('save_term_correction', {
    p_id: id,
    p_corrected: corrected,
    p_form: form,
    p_memo: memo,
    p_editor: g.editor,
  });
  if (error) return { ok: false, error: `저장 실패: ${error.message}` };
  if (data !== 'ok') return { ok: false, error: STATUS_MSG[data as string] ?? '저장에 실패했습니다.' };
  revalidatePath('/corrections');
  return { ok: true };
}

/** '콘텐츠 보기' 모달용 — video_id 로 요약 본문 + 메타 단건 조회(ContentDialog 재사용, 배열 래핑). */
export async function fetchContentByVideoId(videoId: string): Promise<GlossarySourceRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_video_content', { p_video_id: videoId });
  if (error || !data) return [];
  return [data as unknown as GlossarySourceRow];
}
