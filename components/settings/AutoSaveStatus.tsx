/** 자동 저장 상태 표시(저장 버튼 대체). 선택 즉시 저장 → 저장 중/저장됨/오류 안내. */
export function AutoSaveStatus({
  pending,
  ok,
  error,
}: {
  pending: boolean;
  ok?: boolean;
  error?: string;
}) {
  if (error) return <span className="text-xs text-danger">{error}</span>;
  if (pending) return <span className="text-xs text-muted-foreground">저장 중…</span>;
  if (ok) return <span className="text-xs text-accent">저장됨 ✓</span>;
  return <span className="text-xs text-muted-foreground">선택 시 자동 저장</span>;
}
