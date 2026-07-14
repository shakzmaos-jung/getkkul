import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { THEME_TOKENS } from './tokens';
import { APPLIED_THEMES, type AppliedTheme } from './resolve';

// ── WCAG 대비 ──
function hexToRgb(h: string): [number, number, number] {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function lum([r, g, b]: number[]): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(a: string, b: string): number {
  const l1 = lum(hexToRgb(a));
  const l2 = lum(hexToRgb(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// ── globals.css 파싱(테마별 [data-theme] 블록의 --var: value) ──
// vitest 는 apps/web 을 cwd 로 실행한다.
const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
function parseBlock(theme: AppliedTheme): Record<string, string> {
  const anchor = `:root[data-theme="${theme}"]`;
  const start = css.indexOf(anchor);
  if (start < 0) throw new Error(`globals.css 에 ${anchor} 블록이 없다`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

describe('토큰 동기화 — tokens.ts ↔ globals.css', () => {
  for (const t of APPLIED_THEMES) {
    it(`${t}: globals.css 블록 값이 tokens.ts 와 일치`, () => {
      const parsed = parseBlock(t);
      for (const [key, val] of Object.entries(THEME_TOKENS[t])) {
        expect(norm(parsed[key] ?? ''), `${t} ${key}`).toBe(norm(val));
      }
    });
  }
});

describe('테마 대비 — WCAG AA(본문/보조/링크/오류 ≥ 4.5:1)', () => {
  for (const t of APPLIED_THEMES) {
    const v = THEME_TOKENS[t];
    const pairs: [string, string, string][] = [
      ['본문 fg/bg', v['--foreground'], v['--background']],
      ['본문 fg/card', v['--foreground'], v['--card']],
      ['보조 mutedFg/bg', v['--muted-foreground'], v['--background']],
      ['링크 accent/bg', v['--accent'], v['--background']],
      ['오류 danger/bg', v['--danger'], v['--background']],
      ['버튼 accentFg/accent', v['--accent-foreground'], v['--accent']],
      ['버튼 dangerFg/danger', v['--danger-foreground'], v['--danger']],
    ];
    for (const [label, fg, bg] of pairs) {
      it(`${t} · ${label}`, () => {
        expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
