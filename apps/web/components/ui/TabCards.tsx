'use client';

/**
 * 상단 탭 카드 UI (친구 초대/크레딧, 다이제스트/북마크, 구독중/일시정지 공용).
 * 각 탭 제목 우측에 건수 배지(0이면 숨김). 활성 탭은 accent 강조.
 */
export type TabDef = { key: string; title: string; count?: number };

export function TabCards({
  tabs,
  active,
  onChange,
  ariaLabel,
  className = '',
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`grid gap-2 ${className}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            data-testid={`tab-${t.key}`}
            className={`flex items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-accent bg-accent/20 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            <span>{t.title}</span>
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                  isActive ? 'bg-accent/30 text-accent' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
