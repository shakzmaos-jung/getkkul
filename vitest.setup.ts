import '@testing-library/jest-dom/vitest';

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
