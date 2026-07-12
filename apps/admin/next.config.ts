import type { NextConfig } from "next";

// @getkkul/ui 는 TS 소스 워크스페이스 패키지 → Next 가 트랜스파일하도록 등록.
// 보안 헤더 (M6, REQ-SE-1). 어드민 전 경로에 적용.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@getkkul/ui", "@getkkul/domain"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
