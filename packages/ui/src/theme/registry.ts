// 테마 레지스트리 (EXECUTION-PLAN §3.1, REQ-DS-3).
// 멀티테마 아키텍처는 내장하되 **출시는 `linear` 하나만 등록**한다.
// 새 테마 추가 = tokens 에 블록 하나 + 아래 THEME_REGISTRY 에 한 줄. 컴포넌트 수정 0(AC-DS-3a).
import type { ThemeTokens } from './tokens';
import { linear } from './tokens';

export const THEME_REGISTRY = {
  linear,
} as const satisfies Record<string, ThemeTokens>;

export type ThemeId = keyof typeof THEME_REGISTRY;

export const THEME_IDS = Object.keys(THEME_REGISTRY) as ThemeId[];

/** 출시 기본 테마. `<html data-theme>` 초기값. */
export const DEFAULT_THEME: ThemeId = 'linear';

export function getThemeTokens(id: ThemeId): ThemeTokens {
  return THEME_REGISTRY[id];
}

export function isThemeId(value: string): value is ThemeId {
  return Object.prototype.hasOwnProperty.call(THEME_REGISTRY, value);
}
