import { describe, it, expect } from 'vitest';
import { parseChannelFeed, channelFeedUrl } from './rss';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <yt:channelId>UCxvdCnvGODDyuvnELnLkQWw</yt:channelId>
  <title>이효석아카데미</title>
  <entry>
    <id>yt:video:AAA111</id>
    <yt:videoId>AAA111</yt:videoId>
    <yt:channelId>UCxvdCnvGODDyuvnELnLkQWw</yt:channelId>
    <title>첫 번째 영상</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=AAA111"/>
    <published>2026-07-01T09:00:00+00:00</published>
    <updated>2026-07-01T10:00:00+00:00</updated>
  </entry>
  <entry>
    <id>yt:video:BBB222</id>
    <yt:videoId>BBB222</yt:videoId>
    <title>두 번째 영상</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=BBB222"/>
    <published>2026-07-02T09:00:00+00:00</published>
  </entry>
</feed>`;

describe('parseChannelFeed (AC-C1)', () => {
  it('채널 id/제목을 파싱한다', () => {
    const feed = parseChannelFeed(SAMPLE);
    expect(feed.channelId).toBe('UCxvdCnvGODDyuvnELnLkQWw');
    expect(feed.channelTitle).toBe('이효석아카데미');
  });

  it('여러 영상을 videoId/title/url/publishedAt 로 파싱한다', () => {
    const feed = parseChannelFeed(SAMPLE);
    expect(feed.videos).toHaveLength(2);
    expect(feed.videos[0]).toEqual({
      videoId: 'AAA111',
      title: '첫 번째 영상',
      url: 'https://www.youtube.com/watch?v=AAA111',
      publishedAt: '2026-07-01T09:00:00+00:00',
    });
    expect(feed.videos[1].videoId).toBe('BBB222');
  });

  it('entry 가 하나여도(배열 아님) 처리한다', () => {
    const single = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
      <yt:channelId>UC1</yt:channelId><title>C</title>
      <entry><yt:videoId>ONE</yt:videoId><title>t</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=ONE"/>
      <published>2026-07-01T09:00:00+00:00</published></entry>
    </feed>`;
    const feed = parseChannelFeed(single);
    expect(feed.videos).toHaveLength(1);
    expect(feed.videos[0].videoId).toBe('ONE');
  });

  it('영상이 없는 피드도 안전하게 처리한다', () => {
    const empty = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
      <yt:channelId>UC1</yt:channelId><title>C</title></feed>`;
    const feed = parseChannelFeed(empty);
    expect(feed.videos).toEqual([]);
  });

  it('피드 URL 을 구성한다', () => {
    expect(channelFeedUrl('UC123')).toBe(
      'https://www.youtube.com/feeds/videos.xml?channel_id=UC123',
    );
  });
});
