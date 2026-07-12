import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * WebSub(PubSubHubbub) 콜백 검증 (pipeline-reliability REQ-A). 순수 함수 — 테스트 대상.
 * - 알림 페이로드(Atom)는 채널 RSS 와 동일 포맷이라 parseChannelFeed(rss.ts)를 재사용한다.
 * - 여기서는 POST HMAC 서명 검증(AC-A1.2)과 GET 챌린지 검증(AC-A1.1)만 담당.
 */

/** 허브 콜백 구독 토픽(피드) URL. subscribe 시 hub.topic 으로 사용. */
export function websubTopicUrl(channelId: string): string {
  return `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

/**
 * X-Hub-Signature('sha1=<hex>')를 원문 본문에 대한 HMAC-SHA1(secret)로 검증한다(AC-A1.2).
 * 헤더 없음/형식 오류/불일치는 false. 상수 시간 비교.
 */
export function verifyWebSubSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const m = /^sha1=([0-9a-f]+)$/i.exec(signatureHeader.trim());
  if (!m) return false;
  const expected = createHmac('sha1', secret).update(rawBody, 'utf8').digest();
  let got: Buffer;
  try {
    got = Buffer.from(m[1], 'hex');
  } catch {
    return false;
  }
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

/**
 * GET 검증(구독 확인) 통과 여부: hub.mode 가 subscribe/unsubscribe 이고 verify_token 이 일치.
 * 통과 시 호출부는 hub.challenge 를 그대로 에코한다(AC-A1.1).
 */
export function isValidChallenge(
  mode: string | null,
  verifyToken: string | null,
  challenge: string | null,
  expectedToken: string,
): boolean {
  if (!challenge) return false;
  if (mode !== 'subscribe' && mode !== 'unsubscribe') return false;
  return !!expectedToken && verifyToken === expectedToken;
}
