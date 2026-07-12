import { describe, it, expect } from 'vitest';
import { parseYoutubeCookieHeader } from './youtube-cookies';

describe('parseYoutubeCookieHeader', () => {
  it('youtube 쿠키를 name=value; 로 조합, 주석/타도메인 제외', () => {
    const txt = [
      '# Netscape HTTP Cookie File',
      '.youtube.com\tTRUE\t/\tTRUE\t1799999999\tSID\tabc123',
      '#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t1799999999\tHSID\tdef456',
      '.google.com\tTRUE\t/\tTRUE\t1799999999\tNID\tshould_skip',
      '',
    ].join('\n');
    expect(parseYoutubeCookieHeader(txt)).toBe('SID=abc123; HSID=def456');
  });

  it('youtube 쿠키 없으면 null', () => {
    expect(parseYoutubeCookieHeader('# comment only\n.google.com\tTRUE\t/\tTRUE\t1\tNID\tx')).toBeNull();
    expect(parseYoutubeCookieHeader('')).toBeNull();
  });
});
