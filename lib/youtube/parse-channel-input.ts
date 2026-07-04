/**
 * 채널 입력 파싱 (SSR REQ-B1). 사용자가 넣은 채널 URL/핸들을 분류하고,
 * 개별 영상·재생목록은 거부한다(AC-B1.4). 순수 함수 — 단위 테스트 대상.
 * 실제 channel_id 해석(네트워크)은 resolveChannel 이 이 결과를 받아 수행한다.
 */

export type ParsedChannelInput =
  | { kind: 'id'; channelId: string }
  | { kind: 'handle'; handle: string } // '@' 제외한 순수 핸들
  | { kind: 'username'; username: string } // 레거시 /user/
  | { kind: 'custom'; custom: string } // 레거시 /c/
  | { kind: 'reject'; reason: 'video' | 'playlist' | 'empty' | 'invalid' };

const CHANNEL_ID_RE = /^UC[0-9A-Za-z_-]{22}$/;
const HANDLE_RE = /^[A-Za-z0-9._-]{3,30}$/;

/** URL 문자열로 파싱 시도. 프로토콜이 없으면 https:// 를 붙여 재시도. */
function tryParseUrl(input: string): URL | null {
  const candidates = /^https?:\/\//i.test(input) ? [input] : [`https://${input}`];
  for (const c of candidates) {
    try {
      return new URL(c);
    } catch {
      /* noop */
    }
  }
  return null;
}

export function parseChannelInput(raw: string): ParsedChannelInput {
  const input = raw.trim();
  if (!input) return { kind: 'reject', reason: 'empty' };

  // 원시 채널 id
  if (CHANNEL_ID_RE.test(input)) return { kind: 'id', channelId: input };

  // '@handle' (URL 아님)
  if (input.startsWith('@')) {
    const handle = input.slice(1);
    return HANDLE_RE.test(handle)
      ? { kind: 'handle', handle }
      : { kind: 'reject', reason: 'invalid' };
  }

  const looksLikeUrl = /youtube\.com|youtu\.be|\//.test(input);
  if (looksLikeUrl) {
    const url = tryParseUrl(input);
    if (!url) return { kind: 'reject', reason: 'invalid' };

    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const isYouTube = host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
    if (!isYouTube) return { kind: 'reject', reason: 'invalid' };

    // 재생목록 / 개별 영상 거부 (AC-B1.4)
    if (url.searchParams.has('list')) return { kind: 'reject', reason: 'playlist' };
    if (host === 'youtu.be') return { kind: 'reject', reason: 'video' };
    if (url.pathname === '/watch' || url.searchParams.has('v'))
      return { kind: 'reject', reason: 'video' };
    if (url.pathname.startsWith('/playlist')) return { kind: 'reject', reason: 'playlist' };
    if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/'))
      return { kind: 'reject', reason: 'video' };

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return { kind: 'reject', reason: 'invalid' };

    // /@handle
    if (segments[0].startsWith('@')) {
      const handle = segments[0].slice(1);
      return HANDLE_RE.test(handle)
        ? { kind: 'handle', handle }
        : { kind: 'reject', reason: 'invalid' };
    }
    // /channel/UC...
    if (segments[0] === 'channel' && segments[1]) {
      return CHANNEL_ID_RE.test(segments[1])
        ? { kind: 'id', channelId: segments[1] }
        : { kind: 'reject', reason: 'invalid' };
    }
    // /user/name (레거시)
    if (segments[0] === 'user' && segments[1]) {
      return { kind: 'username', username: segments[1] };
    }
    // /c/custom (레거시)
    if (segments[0] === 'c' && segments[1]) {
      return { kind: 'custom', custom: segments[1] };
    }
    return { kind: 'reject', reason: 'invalid' };
  }

  // URL 도 @핸들도 아닌 맨 토큰 → 핸들로 간주
  if (HANDLE_RE.test(input)) return { kind: 'handle', handle: input };

  return { kind: 'reject', reason: 'invalid' };
}
