// REQ-ST-1 loading: 스켈레톤(레이아웃 시프트 방지).
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 p-8" aria-hidden>
      <div className="h-8 w-32 rounded-pill bg-surface-2" />
      <div>
        <div className="mb-3 h-4 w-16 rounded bg-surface-2" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 min-w-28 flex-1 rounded-md bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-hairline bg-surface-1" />
        ))}
      </div>
    </div>
  );
}
