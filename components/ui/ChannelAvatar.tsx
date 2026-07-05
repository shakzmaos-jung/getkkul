interface Props {
  src: string | null;
  title: string;
  size?: number;
}

/** 채널 아바타. 썸네일이 없으면 이니셜 원형으로 폴백. */
export function ChannelAvatar({ src, title, size = 20 }: Props) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={dim}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={dim}
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
    >
      {title.charAt(0) || '?'}
    </span>
  );
}
