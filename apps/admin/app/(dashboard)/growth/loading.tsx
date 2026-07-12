// REQ-ST-1 loading: 스켈레톤.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 p-8" aria-hidden>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-hairline bg-surface-1" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 rounded-md bg-surface-2" />
        ))}
      </div>
      <div className="h-32 rounded-lg border border-hairline bg-surface-1" />
    </div>
  );
}
