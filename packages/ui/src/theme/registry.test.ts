import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { linear, type ThemeTokens } from './tokens';
import {
  THEME_REGISTRY,
  THEME_IDS,
  DEFAULT_THEME,
  getThemeTokens,
  isThemeId,
} from './registry';

const here = dirname(fileURLToPath(import.meta.url));

describe('theme registry (REQ-DS-3 / AC-DS-3a)', () => {
  it('출시 시점엔 linear 하나만 등록된다', () => {
    expect(THEME_IDS).toEqual(['linear']);
    expect(DEFAULT_THEME).toBe('linear');
    expect(isThemeId('linear')).toBe(true);
    expect(isThemeId('honey')).toBe(false);
  });

  it('등록된 모든 테마는 동일한 토큰 키 집합을 노출한다(새 테마=블록+한 줄, 컴포넌트 수정 0)', () => {
    const shape = (t: ThemeTokens) => ({
      color: Object.keys(t.color).sort(),
      radius: Object.keys(t.radius).sort(),
      space: Object.keys(t.space).sort(),
      font: Object.keys(t.font).sort(),
    });
    const base = shape(linear);
    for (const id of THEME_IDS) {
      expect(shape(getThemeTokens(id))).toEqual(base);
    }
  });
});

describe('linear 토큰 값 (REQ-DS-2 / AC-DS-2a)', () => {
  it('Linear 스펙 §3.2 값 스냅샷', () => {
    expect(linear).toMatchSnapshot();
  });

  it('핵심 값 스팟체크(캔버스·라벤더 프라이머리·radius)', () => {
    expect(linear.color.canvas).toBe('#010102');
    expect(linear.color.primary).toBe('#5e6ad2');
    expect(linear.color.primaryFocus).toBe('#5e69d1');
    expect(linear.radius.md).toBe('8px'); // 버튼·인풋
    expect(linear.radius.lg).toBe('12px'); // 카드
    expect(linear.color.canvas).not.toBe('#000000'); // 순수 #000 금지(§3.2 준용)
  });

  it('theme.css 가 tokens.ts 의 색상 값을 모두 미러링한다(CSS↔TS 싱크)', () => {
    const css = readFileSync(resolve(here, '..', 'theme.css'), 'utf8');
    for (const [name, value] of Object.entries(linear.color)) {
      expect(css, `theme.css 에 ${name}(${value}) 누락`).toContain(value);
    }
  });
});
