import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// detect 는 supabase 를 주입받지 않으므로(createPipelineClient 직접 사용) 모듈을 모킹한다.
const upsertSelect = vi.fn(async () => ({ data: [{ video_id: 'v1' }], error: null }));
vi.mock('@/lib/pipeline/supabase', () => ({
  createPipelineClient: () => ({
    from: (t: string) => {
      if (t === 'subscriptions') {
        return {
          select: () =>
            Promise.resolve({ data: [{ channel_id: 'c1' }, { channel_id: 'c2' }], error: null }),
        };
      }
      // videos: upsert(...).select('video_id') / update(...).eq(...)
      return {
        upsert: () => ({ select: upsertSelect }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    },
  }),
}));

const fetchChannelUploads = vi.fn();
vi.mock('@/lib/youtube/channel-uploads', () => ({
  fetchChannelUploads: (id: string) => fetchChannelUploads(id),
}));
vi.mock('@/lib/youtube/fetch-durations', () => ({
  fetchVideoDurations: async () => new Map(),
}));
vi.mock('@/lib/pipeline/youtube-cookies', () => ({ youtubeCookieHeader: () => null }));

import { detectNewVideos } from './detect';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  fetchChannelUploads.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('detectNewVideos — RSS→API 폴백 & 채널별 격리(H6)', () => {
  it('RSS 실패 시 YouTube Data API 로 폴백하고, 한 채널의 폴백 실패가 전체를 막지 않는다', async () => {
    // 두 채널 모두 RSS 404 → API 폴백. c1 성공(신규 1건 등록), c2 는 API 도 실패 → detectFailures.
    const fetchFn = vi.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    fetchChannelUploads
      .mockResolvedValueOnce([
        {
          videoId: 'v1',
          title: 't',
          url: 'https://youtu.be/v1',
          publishedAt: '2026-07-11T00:00:00Z',
        },
      ])
      .mockRejectedValueOnce(new Error('api quota exceeded'));

    const r = await detectNewVideos({ fetchFn });

    expect(r.channels).toBe(2);
    expect(r.registered).toBe(1); // c1 신규 1건
    expect(r.detectFailures).toBe(1); // c2 RSS+API 모두 실패(격리되어 계속)
    expect(fetchChannelUploads).toHaveBeenCalledTimes(2); // 두 채널 모두 폴백 시도
  });
});
