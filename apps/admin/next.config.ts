import type { NextConfig } from "next";

// @getkkul/ui 는 TS 소스 워크스페이스 패키지 → Next 가 트랜스파일하도록 등록.
const nextConfig: NextConfig = {
  transpilePackages: ["@getkkul/ui", "@getkkul/domain"],
};

export default nextConfig;
