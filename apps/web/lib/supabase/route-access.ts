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
