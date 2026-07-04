import { XMLParser } from 'fast-xml-parser';

/**
 * 유튜브 채널 RSS(Atom) 파싱 (SSR AC-C1). 순수 함수 — 단위 테스트 대상.
 * 피드 URL: https://www.youtube.com/feeds/videos.xml?channel_id=UC...
 */

export interface FeedVideo {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string; // ISO 8601 (UTC)
}

export interface ParsedFeed {
  channelId: string | null;
  channelTitle: string | null;
  videos: FeedVideo[];
}

export function channelFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

export function parseChannelFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const feed = (doc.feed ?? {}) as Record<string, unknown>;

  const channelId = (feed['yt:channelId'] as string | undefined) ?? null;
  const channelTitle =
    typeof feed.title === 'string' ? feed.title : ((feed.title as { '#text'?: string })?.['#text'] ?? null);

  const entries = toArray(feed.entry as unknown);
  const videos: FeedVideo[] = [];

  for (const raw of entries) {
    const entry = raw as Record<string, unknown>;
    const videoId = entry['yt:videoId'] as string | undefined;
    if (!videoId) continue;

    const title =
      typeof entry.title === 'string'
        ? entry.title
        : ((entry.title as { '#text'?: string })?.['#text'] ?? '');

    // link[rel=alternate] 의 href, 없으면 watch URL 구성
    let url = '';
    const links = toArray(entry.link as unknown);
    for (const l of links) {
      const link = l as Record<string, string>;
      if (link['@_rel'] === 'alternate' && link['@_href']) {
        url = link['@_href'];
        break;
      }
    }
    if (!url) url = `https://www.youtube.com/watch?v=${videoId}`;

    const publishedAt = (entry.published as string | undefined) ?? '';

    videos.push({ videoId, title, url, publishedAt });
  }

  return { channelId, channelTitle, videos };
}
