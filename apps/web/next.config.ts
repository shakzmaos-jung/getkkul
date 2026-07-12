import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // 앱 버전은 package.json 에서 빌드 시 주입(하드코딩 금지) — 사이드 메뉴 푸터에서 사용.
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  images: {
    // 채널 아바타/썸네일(YouTube CDN). next/image 로 리사이즈·webp·엣지 캐시.
    remotePatterns: [
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
