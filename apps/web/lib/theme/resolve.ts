/**
 * 테마 해석 로직(순수). UI/저장에는 '선호(preference)'를, <html data-theme> 에는 '적용(applied)'을 쓴다.
 * 'system' 은 OS 밝기에 따라 light/dark 로 해석한다. 이 함수는 부트스트랩 스크립트·ThemeProvider·테스트가 공유.
 */

/** 실제 [data-theme] 값(=globals.css 블록). */
export const APPLIED_THEMES = ['light', 'dark', 'paper', 'grayscale', 'nightshift'] as const;
export type AppliedTheme = (typeof APPLIED_THEMES)[number];

/** 사용자가 고르고 저장하는 값(=system + 5종). */
export const THEME_PREFERENCES = ['system', ...APPLIED_THEMES] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_PREFERENCE: ThemePreference = 'system';

export function isThemePreference(v: unknown): v is ThemePreference {
  return typeof v === 'string' && (THEME_PREFERENCES as readonly string[]).includes(v);
}

export function isAppliedTheme(v: unknown): v is AppliedTheme {
  return typeof v === 'string' && (APPLIED_THEMES as readonly string[]).includes(v);
}

/** 선호 → 실제 적용 테마. system 이면 OS 밝기(prefersDark)로 light/dark 결정. */
export function resolveApplied(preference: ThemePreference, prefersDark: boolean): AppliedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}
