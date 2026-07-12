import { defineConfig } from 'vitest/config';

// packages/ui 테스트는 순수 TS(토큰 레지스트리·CSS 싱크) — jsdom/react 불필요.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
