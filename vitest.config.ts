import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig의 "@/*" 경로 별칭을 네이티브로 해석 (Vite 6+/Vitest 4)
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 유닛 테스트만 대상. E2E(Playwright)는 별도 러너.
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
