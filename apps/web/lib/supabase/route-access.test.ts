import { describe, it, expect } from 'vitest';
import { isPublicPath, shouldRedirectToLogin, safeNextPath } from './route-access';

describe('route-access (AC-A1.1 보호 라우트)', () => {
  it('공개 경로(/login, /auth/*, /r/*)는 public 으로 판정한다', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
    expect(isPublicPath('/auth/auth-code-error')).toBe(true);
    expect(isPublicPath('/r/ABCDE23456')).toBe(true); // 추천 링크(AC-A2.1)
    expect(isPublicPath('/opengraph-image')).toBe(true); // 공유 미리보기 이미지
    expect(isPublicPath('/api/webhooks/youtube')).toBe(true); // WebSub 콜백
  });

  it('그 외 경로는 보호 경로로 판정한다', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/settings')).toBe(false);
    // 접두사만 우연히 겹치는 경로는 공개가 아니다
    expect(isPublicPath('/loginx')).toBe(false);
    expect(isPublicPath('/authorize')).toBe(false);
    expect(isPublicPath('/reader')).toBe(false);
  });

  it('미인증 사용자가 보호 경로에 접근하면 로그인으로 보낸다', () => {
    expect(shouldRedirectToLogin(false, '/')).toBe(true);
    expect(shouldRedirectToLogin(false, '/dashboard')).toBe(true);
  });

  it('미인증이어도 공개 경로는 리디렉션하지 않는다', () => {
    expect(shouldRedirectToLogin(false, '/login')).toBe(false);
    expect(shouldRedirectToLogin(false, '/auth/callback')).toBe(false);
  });

  it('인증된 사용자는 어떤 경로도 리디렉션하지 않는다', () => {
    expect(shouldRedirectToLogin(true, '/')).toBe(false);
    expect(shouldRedirectToLogin(true, '/dashboard')).toBe(false);
    expect(shouldRedirectToLogin(true, '/login')).toBe(false);
  });
});

describe('safeNextPath (오픈리다이렉트 방어)', () => {
  it('앱 내부 절대경로는 그대로 통과시킨다', () => {
    expect(safeNextPath('/')).toBe('/');
    expect(safeNextPath('/feed')).toBe('/feed');
    expect(safeNextPath('/settings?tab=email')).toBe('/settings?tab=email');
    expect(safeNextPath('/feed#top')).toBe('/feed#top');
  });

  it('빈 값·null·undefined 는 루트로 폴백한다', () => {
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath('')).toBe('/');
  });

  it('프로토콜상대·절대 URL·백슬래시 트릭을 차단한다', () => {
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('/\\evil.com')).toBe('/');
    expect(safeNextPath('/foo\\bar')).toBe('/');
    expect(safeNextPath('javascript:alert(1)')).toBe('/');
  });

  it('선행 슬래시가 없으면 루트로 폴백한다', () => {
    expect(safeNextPath('feed')).toBe('/');
    expect(safeNextPath('..%2Fevil')).toBe('/');
  });

  it('제어문자·공백이 섞이면 루트로 폴백한다', () => {
    expect(safeNextPath('/\t//evil')).toBe('/');
    expect(safeNextPath('/ /evil')).toBe('/');
    expect(safeNextPath('/foo\nbar')).toBe('/');
  });
});
