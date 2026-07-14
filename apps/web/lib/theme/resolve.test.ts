import { describe, it, expect } from 'vitest';
import {
  resolveApplied,
  isThemePreference,
  isAppliedTheme,
  THEME_PREFERENCES,
  APPLIED_THEMES,
} from './resolve';

describe('resolveApplied — 선호 → 적용 테마', () => {
  it('system 은 OS 밝기에 따라 dark/light 로 해석', () => {
    expect(resolveApplied('system', true)).toBe('dark');
    expect(resolveApplied('system', false)).toBe('light');
  });
  it('명시 테마는 OS 밝기와 무관하게 그대로', () => {
    for (const t of APPLIED_THEMES) {
      expect(resolveApplied(t, true)).toBe(t);
      expect(resolveApplied(t, false)).toBe(t);
    }
  });
});

describe('타입 가드', () => {
  it('isThemePreference: system+5종 통과, 그 외 거부', () => {
    for (const p of THEME_PREFERENCES) expect(isThemePreference(p)).toBe(true);
    expect(isThemePreference('nope')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
  it('isAppliedTheme: 5종만 통과(system 은 applied 아님)', () => {
    for (const t of APPLIED_THEMES) expect(isAppliedTheme(t)).toBe(true);
    expect(isAppliedTheme('system')).toBe(false);
  });
});
