/**
 * getkkul 관제 어드민 — 테마 레지스트리
 * 멀티테마 요구(내장, 미노출): 아키텍처는 준비하되 출시는 `linear` 하나만 등록.
 * 새 테마 = theme.css 에 [data-theme="id"] 블록 추가 + 아래 THEMES 에 한 줄 추가.
 *
 * 위치(M1): packages/ui/src/theme/registry.ts
 */

export type ThemeId = "linear"; // 테마 추가 시 유니온 확장: "linear" | "honey-control" | ...

export interface ThemeMeta {
  id: ThemeId;
  /** 설정 UI 표시명 */
  label: string;
  /** 스와치(피커 미리보기용) — theme.css 의 --primary 와 일치 */
  swatch: string;
  /** 명도 힌트(자동 대비·아이콘 선택 등에 사용) */
  scheme: "dark" | "light";
}

/** 출시 시점: linear 단일. 추가 테마는 여기에 등록. */
export const THEMES: readonly ThemeMeta[] = [
  { id: "linear", label: "Linear", swatch: "#5e6ad2", scheme: "dark" },
] as const;

export const DEFAULT_THEME: ThemeId = "linear";

export function isThemeId(v: string): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}

/* ---------------------------------------------------------------------------
 * ThemeProvider 스케치 (M1 구현 대상 — 여기선 계약만):
 *
 *   "use client";
 *   import { DEFAULT_THEME, isThemeId, type ThemeId } from "./registry";
 *
 *   // <html data-theme> 를 제어. 초기값 DEFAULT_THEME.
 *   // 사용자 선택은 서버(user_settings 확장) 또는 쿠키에 저장 —
 *   // 어드민은 민감 화면이라 localStorage 대신 서버/쿠키 권장.
 *   export function applyTheme(id: ThemeId) {
 *     if (!isThemeId(id)) id = DEFAULT_THEME;
 *     document.documentElement.setAttribute("data-theme", id);
 *   }
 *
 * 테마 전환은 data-theme 속성 교체뿐 — 컴포넌트 마크업/클래스는 불변.
 * (SSR: SSR.md REQ-DS-3 참조)
 * ------------------------------------------------------------------------- */
