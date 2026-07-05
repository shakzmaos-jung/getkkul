'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLengthMode, type LengthMode } from '@/lib/summary/format';

export type SettingsState = { ok?: boolean; error?: string };

/** 요약 길이 모드 변경 (SSR REQ-D2). RLS 로 본인 user_settings 만 수정. */
export async function updateSummaryLength(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const mode = String(formData.get('summary_length') ?? '');
  if (!isLengthMode(mode)) {
    return { error: '유효하지 않은 길이 모드입니다.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_settings')
    .update({ summary_length: mode as LengthMode })
    .eq('user_id', user.id);

  if (error) return { error: '설정 저장에 실패했습니다.' };

  revalidatePath('/settings');
  return { ok: true };
}
