/**
 * PWA 플랫폼 판정(순수 함수 — 단위 테스트 대상).
 * iOS 는 홈화면 설치(standalone) 상태에서만 푸시 구독이 가능하다(AC-C1.2).
 */

export type OS = 'ios' | 'android' | 'other';

/** UA 로 OS 판정. iPadOS 는 데스크톱 UA(Macintosh)로 위장할 수 있어 호출부에서 터치 여부로 보정한다. */
export function detectOS(userAgent: string): OS {
  const ua = (userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export function isIos(userAgent: string): boolean {
  return detectOS(userAgent) === 'ios';
}

/** display-mode:standalone 또는 iOS navigator.standalone 이면 설치 실행 상태(순수·테스트). */
export function isStandalone(displayModeStandalone: boolean, iosStandalone: boolean): boolean {
  return displayModeStandalone || iosStandalone;
}

/** 브라우저에서 standalone 판정(호출부 편의). SSR 안전. */
export function isStandaloneNow(): boolean {
  if (typeof window === 'undefined') return false;
  const dm = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const ios = (window.navigator as { standalone?: boolean }).standalone === true;
  return isStandalone(dm, ios);
}

/** 푸시 구독 버튼 노출/활성 조건: iOS 는 standalone 일 때만, 그 외는 항상 가능(AC-C1.2). */
export function canSubscribePush(os: OS, standalone: boolean): boolean {
  if (os === 'ios') return standalone;
  return true;
}
