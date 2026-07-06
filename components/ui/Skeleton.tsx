/** 로딩 스켈레톤 블록 (animate-pulse). route 별 loading.tsx 에서 사용. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden />;
}
