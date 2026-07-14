'use server';

import { createClient } from '@/lib/supabase/server';
import { isThemePreference, type ThemePreference } from './resolve';

/** 선택 테마를 DB(user_settings.theme)에 저장 — 기기 간 유지. 비로그인/실패는 조용히 no-op(localStorage 유지). */
export async function saveThemePreference(pref: ThemePreference): Promise<{ ok: boolean }> {
  if (!isThemePreference(pref)) return { ok: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, theme: pref }, { onConflict: 'user_id' });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
