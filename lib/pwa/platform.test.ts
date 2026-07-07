import { describe, it, expect } from 'vitest';
import { detectOS, isIos, isStandalone, canSubscribePush } from './platform';

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/122 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122 Safari/537.36';

describe('detectOS / isIos', () => {
  it('UA 별 OS', () => {
    expect(detectOS(IOS_UA)).toBe('ios');
    expect(detectOS(ANDROID_UA)).toBe('android');
    expect(detectOS(DESKTOP_UA)).toBe('other');
    expect(detectOS('')).toBe('other');
    expect(isIos(IOS_UA)).toBe(true);
    expect(isIos(ANDROID_UA)).toBe(false);
  });
});

describe('isStandalone', () => {
  it('display-mode 또는 iOS standalone 이면 true, 둘 다 아니면 false', () => {
    expect(isStandalone(true, false)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, false)).toBe(false);
  });
});

describe('canSubscribePush', () => {
  it('iOS 는 standalone 일 때만 가능', () => {
    expect(canSubscribePush('ios', false)).toBe(false); // 사파리 탭
    expect(canSubscribePush('ios', true)).toBe(true); // 홈화면 설치
  });
  it('Android/기타는 standalone 무관하게 가능', () => {
    expect(canSubscribePush('android', false)).toBe(true);
    expect(canSubscribePush('other', false)).toBe(true);
  });
});
