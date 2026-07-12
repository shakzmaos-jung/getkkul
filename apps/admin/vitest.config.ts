import { defineConfig } from 'vitest/config';

// M1 어드민 테스트는 순수 인가 로직(access.test) — node 환경으로 충분.
// @/* 별칭은 apps/admin/tsconfig.json(@/*→./*)을 tsconfigPaths 로 해석.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
  },
});
