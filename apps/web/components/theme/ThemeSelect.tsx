'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { THEME_PREFERENCES, type ThemePreference } from '@/lib/theme/resolve';
import { themeSwatch } from '@/lib/theme/tokens';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { messages } from '@/lib/i18n';

const t = messages.theme;

/** 테마별 대표색 미리보기 스와치. system 은 라이트+다크 반반. 고정 색(현재 테마 무관)이라 인라인 스타일. */
function Swatch({ id }: { id: ThemePreference }) {
  if (id === 'system') {
    const l = themeSwatch('light');
    const d = themeSwatch('dark');
    return (
      <span
        aria-hidden
        className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border"
      >
        <span className="h-full w-1/2" style={{ background: l.bg }} />
        <span className="h-full w-1/2" style={{ background: d.bg }} />
        <span
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: d.accent, boxShadow: `0 0 0 2px ${l.bg}` }}
        />
      </span>
    );
  }
  const s = themeSwatch(id);
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center gap-1 rounded-md border border-border"
      style={{ background: s.bg }}
    >
      <span className="h-4 w-4 rounded" style={{ background: s.card, boxShadow: `inset 0 0 0 1px ${s.accent}22` }} />
      <span className="flex flex-col gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: s.accent }} />
        <span className="h-2 w-2 rounded-full" style={{ background: s.brand }} />
      </span>
    </span>
  );
}

/**
 * 테마 선택 — system + 5종 라디오 카드. 선택 즉시 반영·저장(localStorage + DB).
 * compact: 사이드패널 아코디언용 축약(단일열 · 설명 생략 · 패딩 축소). 기본은 설정 화면용(설명 포함 2열).
 */
export default function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label={t.title}
      className={compact ? 'grid grid-cols-1 gap-1.5' : 'grid grid-cols-1 gap-2 sm:grid-cols-2'}
    >
      {THEME_PREFERENCES.map((id) => {
        const selected = preference === id;
        const m = t[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={`theme-${id}`}
            onClick={() => setPreference(id)}
            className={`relative flex items-center gap-3 rounded-lg border pr-8 text-left transition-colors ${
              compact ? 'p-2.5' : 'p-3'
            } ${selected ? 'border-accent bg-accent/10' : 'border-border hover:border-foreground/40'}`}
          >
            <Swatch id={id} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.desc}</span>
            </span>
            {selected && (
              <CheckIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
