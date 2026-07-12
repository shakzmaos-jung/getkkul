// Linear 디자인 토큰 (출시 테마 = "linear"). EXECUTION-PLAN §3.2 값.
// 이 파일이 토큰의 **단일 진실 공급원(TS)** — theme.css(CSS 변수)는 이 값을 미러링하고,
// registry.test 가 스냅샷으로 고정한다(AC-DS-2a). 컴포넌트는 raw 값이 아니라 시맨틱 토큰
// (CSS var)만 참조한다(AC-DS-1a).

/**
 * 테마 토큰 스키마. 모든 테마는 **같은 키 집합**을 제공해야 한다.
 * → 새 테마 추가 = 토큰 블록 하나 + 레지스트리 한 줄(컴포넌트 수정 0, AC-DS-3a).
 */
export type ThemeTokens = {
  color: {
    // 서피스 사다리 (엘리베이션 = 그림자 대신 서피스+헤어라인)
    canvas: string;
    surface1: string;
    surface2: string;
    surface3: string;
    surface4: string;
    // 헤어라인
    hairline: string;
    hairlineStrong: string;
    hairlineTertiary: string;
    // 프라이머리(라벤더) — 브랜드마크·CTA·포커스·링크 전용
    primary: string;
    primaryHover: string;
    primaryFocus: string;
    onPrimary: string;
    // 잉크(텍스트) 사다리
    ink: string;
    inkMuted: string;
    inkSubtle: string;
    inkTertiary: string;
    // 관제 시맨틱 (상태색 — 색만으로 전달 금지, 텍스트/아이콘 병기)
    ok: string;
    warn: string;
    crit: string;
    info: string;
  };
  radius: {
    xs: string;
    sm: string;
    md: string; // 버튼·인풋
    lg: string; // 카드
    xl: string;
    pill: string;
  };
  space: {
    1: string;
    2: string;
    3: string;
    4: string;
    6: string;
    8: string;
    12: string;
    24: string;
  };
  font: {
    sans: string; // Inter (Linear 최근접 무료 대체)
    mono: string; // Geist Mono (설치됨)
  };
};

export const linear: ThemeTokens = {
  color: {
    canvas: '#010102',
    surface1: '#0f1011',
    surface2: '#141516',
    surface3: '#18191a',
    surface4: '#191a1b',
    hairline: '#23252a',
    hairlineStrong: '#34343a',
    hairlineTertiary: '#3e3e44',
    primary: '#5e6ad2',
    primaryHover: '#828fff',
    primaryFocus: '#5e69d1',
    onPrimary: '#ffffff',
    ink: '#f7f8f8',
    inkMuted: '#d0d6e0',
    inkSubtle: '#8a8f98',
    inkTertiary: '#62666d',
    ok: '#27a644',
    warn: '#d9a531',
    crit: '#e5484d',
    info: '#5e6ad2',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    pill: '9999px',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    24: '96px',
  },
  font: {
    sans: 'var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace',
  },
};
