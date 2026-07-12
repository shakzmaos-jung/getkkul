/** 사용자 아바타 — 프로필 이미지가 있으면 표시, 없으면 이름 이니셜 원형 폴백. */
export function UserAvatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  if (src) {
    return (
      // 원격(구글) 아바타 — 최적화 불필요한 소형 이미지라 plain img 사용.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
    >
      {initial}
    </span>
  );
}
