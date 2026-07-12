/**
 * 라우트 접근 규칙 (SSR AC-A1.1).
 * 인증 없이 접근 가능한 공개 경로를 판정하는 순수 함수 — proxy 에서 사용, 단위 테스트 대상.
 */

/**
 * 로그인 없이 접근 가능한 경로 접두사.
 * `/r`=추천 링크(코드 쿠키 저장 후 리디렉션, AC-A2.1).
 * `/opengraph-image`=공유 미리보기 이미지(크롤러가 비로그인으로 가져감).
 * `/api/webhooks`=WebSub 등 외부 콜백(인증 대신 HMAC/토큰 검증).
 */
export const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/auth',
  '/r',
  '/opengraph-image',
  '/api/webhooks',
] as const;

/** 주어진 경로가 공개(비보호) 경로인지 판정한다. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * 인증 상태와 경로로 로그인 리디렉션 여부를 결정한다.
 * @returns true 면 /login 으로 보내야 한다 (미인증 + 보호 경로).
 */
export function shouldRedirectToLogin(
  hasUser: boolean,
  pathname: string,
): boolean {
  return !hasUser && !isPublicPath(pathname);
}

/**
 * 로그인/귀속 후 리디렉션 목적지(`next`)를 **앱 내부 경로로만** 강제하는 순수 함수.
 * OAuth 콜백/claim 이 `${origin}${next}` 로 리디렉트하므로, 공격자가 넣은
 * 프로토콜상대(`//host`)·백슬래시·비경로 값이 오픈리다이렉트/경로조작이 되지 않게 막는다.
 * 안전하지 않으면 `'/'` 로 폴백한다.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  // 단일 슬래시로 시작하는 절대경로만 허용.
  if (!next.startsWith('/')) return '/';
  // 프로토콜상대(`//evil`) 및 백슬래시 트릭(`/\evil`, `\`) 차단.
  if (next.startsWith('//') || next.includes('\\')) return '/';
  // 제어문자/공백(코드포인트 ≤ 0x20)은 URL 파서를 헷갈리게 할 수 있으므로 배제.
  for (let i = 0; i < next.length; i++) {
    if (next.charCodeAt(i) <= 0x20) return '/';
  }
  return next;
}
