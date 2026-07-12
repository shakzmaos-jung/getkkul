import { defineConfig } from 'vitest/config';

// packages/domain 테스트는 순수 TS — node 환경.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
