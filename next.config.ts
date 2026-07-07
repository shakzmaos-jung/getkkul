import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
