'use client';

import { useState } from 'react';

/**
 * 개발자 프로필 아바타 — 앰버(#F5A623) 톤 원형 프레임. 이미지가 없거나 로드 실패하면
 * 이니셜('정')로 폴백한다. 이미지 경로는 부모에서 상수로 주입(교체 용이).
 */
export function ProfileAvatar({
  src,
  initial,
  alt,
  size = 104,
}: {
  src?: string | null;
  initial: string;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5A623]/15 ring-4 ring-[#F5A623]/40"
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // 로컬/원격 프로필 이미지. 없으면 onError 로 이니셜 폴백.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden className="text-3xl font-bold text-[#F5A623]">
          {initial}
        </span>
      )}
    </div>
  );
}
