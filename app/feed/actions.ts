'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isLengthMode } from '@/lib/summary/format';

/**
 * 다이제스트에서 요약 길이 모드 변경 (SSR REQ-D2). user_settings.summary_length 갱신.
 * RLS + 컬럼 권한으로 사용자는 summary_length 만 직접 수정 가능.
 */
export async function setSummaryLength(mode: string): Promise<void> {
  if (!isLengthMode(mode)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('user_settings').update({ summary_length: mode }).eq('user_id', user.id);
  revalidatePath('/feed');
}
