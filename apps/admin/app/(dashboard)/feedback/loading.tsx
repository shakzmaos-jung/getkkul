// 피드백 이력 loading 스켈레톤.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-8" aria-hidden>
      <div className="h-6 w-64 rounded-lg border border-hairline bg-surface-1" />
      <div className="h-10 rounded-lg border border-hairline bg-surface-1" />
      <div className="h-96 rounded-lg border border-hairline bg-surface-1" />
    </div>
  );
}
