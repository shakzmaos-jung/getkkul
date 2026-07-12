import { MODULES } from '@/lib/modules';

/** 모듈 빈 상태 (M1 셸). 실제 위젯은 해당 마일스톤에서 구현. */
export function EmptyModule({ id }: { id: string }) {
  const m = MODULES.find((x) => x.id === id);
  if (!m) return null;
  return (
    <section className="p-8">
      <div className="mx-auto max-w-2xl rounded-lg border border-hairline bg-surface-1 p-8 text-center">
        <h2 className="text-lg font-semibold text-ink">{m.label}</h2>
        <p className="mt-1.5 text-sm text-ink-subtle">{m.desc}</p>
        <p className="mt-4 inline-block rounded-pill bg-surface-2 px-3 py-1 text-xs text-ink-tertiary">
          준비 중 · {m.milestone} 에서 구현
        </p>
      </div>
    </section>
  );
}
