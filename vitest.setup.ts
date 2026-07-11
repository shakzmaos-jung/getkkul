import '@testing-library/jest-dom/vitest';
import pkg from './package.json';

// 브라우저 Supabase 클라이언트가 테스트에서 throw 하지 않도록 더미 env(세션은 없음).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
// 앱 버전(프로덕션은 next.config 가 package.json 에서 주입) — 테스트에서도 package.json 기반으로.
process.env.NEXT_PUBLIC_APP_VERSION ??= pkg.version;

// jsdom 에는 matchMedia 가 없다 — 테마 감지 등 컴포넌트가 안전히 마운트되도록 stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
