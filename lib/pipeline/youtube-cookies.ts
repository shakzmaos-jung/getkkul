import { readFileSync } from 'node:fs';

/**
 * Netscape cookies.txt 텍스트에서 youtube.com 쿠키만 뽑아 HTTP Cookie 헤더 문자열로 만든다.
 * RSS 등 일반 fetch 에 로그인 세션을 붙여 데이터센터 IP 차단(404) 우회를 시도한다.
 * 형식: 탭 7필드(domain, includeSub, path, secure, expiry, name, value). `#HttpOnly_` 접두는 쿠키 라인.
 */
export function parseYoutubeCookieHeader(text: string): string | null {
  const pairs: string[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      if (line.startsWith('#HttpOnly_')) line = line.slice('#HttpOnly_'.length);
      else continue; // 일반 주석
    }
    const f = line.split('\t');
    if (f.length < 7) continue;
    if (!f[0].includes('youtube.com')) continue;
    const name = f[5];
    const value = f[6];
    if (!name) continue;
    pairs.push(`${name}=${value}`);
  }
  return pairs.length ? pairs.join('; ') : null;
}

/** YTDLP_COOKIES_FILE 파일에서 youtube 쿠키 헤더를 읽는다(파이프라인 서버측). 없으면 null. */
export function youtubeCookieHeader(): string | null {
  const path = process.env.YTDLP_COOKIES_FILE;
  if (!path) return null;
  try {
    return parseYoutubeCookieHeader(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}
