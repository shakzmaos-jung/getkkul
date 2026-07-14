import { createClient } from '@/lib/supabase/server';
import { isThemePreference, type ThemePreference } from './resolve';

/**
 * SSR 초기 테마 선호 — 로그인 사용자의 user_settings.theme(기기 간 유지). 부트스트랩 스크립트·ThemeProvider
 * 초기값으로 주입되어 새 기기에서도 깜빡임 없이 적용된다. 비로그인/실패/미설정은 null(→ localStorage/system).
 * getSession(프록시 검증, 네트워크 없음)으로 루트 레이아웃 부하를 최소화한다.
 */
export async function getThemePreference(): Promise<ThemePreference | null> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;
    const { data } = await supabase
      .from('user_settings')
      .select('theme')
      .eq('user_id', user.id)
      .maybeSingle();
    return isThemePreference(data?.theme) ? (data!.theme as ThemePreference) : null;
  } catch {
    return null;
  }
}
