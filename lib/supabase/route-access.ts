/**
 * 라우트 접근 규칙 (SSR AC-A1.1).
 * 인증 없이 접근 가능한 공개 경로를 판정하는 순수 함수 — proxy 에서 사용, 단위 테스트 대상.
 */

/** 로그인 없이 접근 가능한 경로 접두사. */
export const PUBLIC_PATH_PREFIXES = ['/login', '/auth'] as const;

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
