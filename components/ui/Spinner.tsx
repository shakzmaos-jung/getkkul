/** 저장 중 로딩 스피너. currentColor 기반. */
export function Spinner({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="저장 중"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${
        className ?? ''
      }`}
      style={{ width: size, height: size }}
    />
  );
}
