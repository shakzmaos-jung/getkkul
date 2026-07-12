// REQ-ST-1 loading: 스켈레톤.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-8 p-8" aria-hidden>
      <div className="h-56 rounded-lg border border-hairline bg-surface-1" />
      <div className="h-56 rounded-lg border border-hairline bg-surface-1" />
    </div>
  );
}
