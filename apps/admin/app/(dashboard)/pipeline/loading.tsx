// REQ-ST-1 loading: 스켈레톤.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 p-8" aria-hidden>
      <div>
        <div className="mb-3 h-4 w-56 rounded bg-surface-2" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 min-w-36 flex-1 rounded-md bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-hairline bg-surface-1" />
        ))}
      </div>
      <div className="h-64 rounded-lg border border-hairline bg-surface-1" />
    </div>
  );
}
