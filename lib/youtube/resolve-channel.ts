import 'server-only';
import { parseChannelInput } from './parse-channel-input';

/**
 * 채널 해석 인터페이스 (SSR REQ-B1, ADR-0003).
 * 핸들/URL → { channelId, title, url }. YouTube Data API v3 구현.
 * 상위 구독 로직은 이 인터페이스만 알고 구현(교체 가능)을 모른다.
 */

export type ChannelResolveErrorCode =
  | 'invalid_input'
  | 'video'
  | 'playlist'
  | 'not_found'
  | 'missing_key'
  | 'api_error';

export class ChannelResolveError extends Error {
  code: ChannelResolveErrorCode;
  constructor(code: ChannelResolveErrorCode, message: string) {
    super(message);
    this.name = 'ChannelResolveError';
    this.code = code;
  }
}

export interface ResolvedChannel {
  channelId: string;
  title: string;
  url: string;
}

interface YtChannelsResponse {
  items?: { id: string; snippet: { title: string } }[];
}
interface YtSearchResponse {
  items?: { id: { channelId?: string }; snippet: { title: string } }[];
}

const API_BASE = 'https://www.googleapis.com/youtube/v3';

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new ChannelResolveError('missing_key', 'YouTube API 키가 설정되지 않았습니다.');
  }
  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries({ ...params, key })) url.searchParams.set(k, v);

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new ChannelResolveError('api_error', `채널 조회에 실패했습니다 (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function resolveChannel(input: string): Promise<ResolvedChannel> {
  const parsed = parseChannelInput(input);

  switch (parsed.kind) {
    case 'reject':
      if (parsed.reason === 'video')
        throw new ChannelResolveError('video', '개별 영상이 아니라 채널을 입력해 주세요.');
      if (parsed.reason === 'playlist')
        throw new ChannelResolveError('playlist', '재생목록이 아니라 채널을 입력해 주세요.');
      throw new ChannelResolveError('invalid_input', '유효한 채널 URL 또는 핸들이 아닙니다.');

    case 'id':
      return finalizeFromChannels(
        await ytFetch<YtChannelsResponse>('channels', {
          part: 'snippet',
          id: parsed.channelId,
        }),
      );

    case 'handle':
      return finalizeFromChannels(
        await ytFetch<YtChannelsResponse>('channels', {
          part: 'snippet',
          forHandle: `@${parsed.handle}`,
        }),
      );

    case 'username':
      return finalizeFromChannels(
        await ytFetch<YtChannelsResponse>('channels', {
          part: 'snippet',
          forUsername: parsed.username,
        }),
      );

    case 'custom': {
      // 레거시 /c/ 커스텀명은 검색 폴백 (best-effort)
      const data = await ytFetch<YtSearchResponse>('search', {
        part: 'snippet',
        type: 'channel',
        maxResults: '1',
        q: parsed.custom,
      });
      const item = data.items?.[0];
      if (!item?.id.channelId) {
        throw new ChannelResolveError('not_found', '채널을 찾을 수 없습니다.');
      }
      return {
        channelId: item.id.channelId,
        title: item.snippet.title,
        url: `https://www.youtube.com/channel/${item.id.channelId}`,
      };
    }
  }
}

function finalizeFromChannels(data: YtChannelsResponse): ResolvedChannel {
  const item = data.items?.[0];
  if (!item) {
    throw new ChannelResolveError('not_found', '채널을 찾을 수 없습니다.');
  }
  return {
    channelId: item.id,
    title: item.snippet.title,
    url: `https://www.youtube.com/channel/${item.id}`,
  };
}
