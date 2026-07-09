import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebSubSignature, isValidChallenge, websubTopicUrl } from './websub';
import { parseChannelFeed } from './rss';

const SECRET = 's3cr3t';
function sign(body: string, secret = SECRET): string {
  return 'sha1=' + createHmac('sha1', secret).update(body, 'utf8').digest('hex');
}

describe('verifyWebSubSignature (AC-A1.2 HMAC)', () => {
  const body = '<feed>...</feed>';
  it('올바른 서명은 통과', () => {
    expect(verifyWebSubSignature(body, sign(body), SECRET)).toBe(true);
  });
  it('본문 변조/다른 시크릿은 거부', () => {
    expect(verifyWebSubSignature(body + 'x', sign(body), SECRET)).toBe(false);
    expect(verifyWebSubSignature(body, sign(body, 'other'), SECRET)).toBe(false);
  });
  it('헤더 없음/형식 오류는 거부', () => {
    expect(verifyWebSubSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebSubSignature(body, 'sha256=abcd', SECRET)).toBe(false);
    expect(verifyWebSubSignature(body, 'garbage', SECRET)).toBe(false);
  });
});

describe('isValidChallenge (AC-A1.1 GET 검증)', () => {
  it('mode+토큰 일치 + challenge 있으면 통과', () => {
    expect(isValidChallenge('subscribe', 'tok', 'CH', 'tok')).toBe(true);
    expect(isValidChallenge('unsubscribe', 'tok', 'CH', 'tok')).toBe(true);
  });
  it('토큰 불일치/모드 이상/challenge 없음은 거부', () => {
    expect(isValidChallenge('subscribe', 'bad', 'CH', 'tok')).toBe(false);
    expect(isValidChallenge('other', 'tok', 'CH', 'tok')).toBe(false);
    expect(isValidChallenge('subscribe', 'tok', null, 'tok')).toBe(false);
  });
});

describe('websubTopicUrl', () => {
  it('채널 피드 토픽 URL', () => {
    expect(websubTopicUrl('UC_abc')).toBe(
      'https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC_abc',
    );
  });
});

describe('WebSub Atom 페이로드는 parseChannelFeed 로 파싱 (AC-A1.3 재사용)', () => {
  const push = `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
      <yt:channelId>UC_chan</yt:channelId>
      <entry>
        <yt:videoId>VID123</yt:videoId>
        <yt:channelId>UC_chan</yt:channelId>
        <title>새 영상</title>
        <link rel="alternate" href="https://www.youtube.com/watch?v=VID123"/>
        <published>2026-07-09T00:00:00+00:00</published>
      </entry>
    </feed>`;
  it('videoId·channelId·title·url 추출', () => {
    const parsed = parseChannelFeed(push);
    expect(parsed.channelId).toBe('UC_chan');
    expect(parsed.videos).toHaveLength(1);
    expect(parsed.videos[0].videoId).toBe('VID123');
    expect(parsed.videos[0].url).toContain('VID123');
    expect(parsed.videos[0].title).toBe('새 영상');
  });
});
