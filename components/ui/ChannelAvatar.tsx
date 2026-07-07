import Image from 'next/image';

interface Props {
  src: string | null;
  title: string;
  size?: number;
}

/** 채널 아바타. 썸네일이 없으면 이니셜 원형으로 폴백. next/image 로 최적화(리사이즈·webp·엣지 캐시). */
export function ChannelAvatar({ src, title, size = 20 }: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
    >
      {title.charAt(0) || '?'}
    </span>
  );
}
