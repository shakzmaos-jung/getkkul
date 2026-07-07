import { describe, it, expect, vi } from 'vitest';
import { fetchChannelUploads } from './channel-uploads';

describe('fetchChannelUploads', () => {
  it('UC → UU 업로드 재생목록으로 조회, FeedVideo[] 로 매핑', async () => {
    const fetchFn = vi.fn<(url: RequestInfo | URL) => Promise<Response>>(async (url) => {
      const u = new URL(url as URL);
      expect(u.searchParams.get('playlistId')).toBe('UUabc123');
      expect(u.searchParams.get('maxResults')).toBe('15');
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: { title: '영상 A', publishedAt: '2026-07-07T00:00:00Z' },
              contentDetails: { videoId: 'vid1', videoPublishedAt: '2026-07-07T01:00:00Z' },
            },
            { snippet: { title: '메타없음' }, contentDetails: {} }, // videoId 없음 → 제외
          ],
        }),
      } as Response;
    });
    const out = await fetchChannelUploads('UCabc123', { fetchFn, apiKey: 'k' });
    expect(out).toEqual([
      {
        videoId: 'vid1',
        title: '영상 A',
        url: 'https://www.youtube.com/watch?v=vid1',
        publishedAt: '2026-07-07T01:00:00Z', // videoPublishedAt 우선
      },
    ]);
  });

  it('키 없음/HTTP 실패/비UC 채널은 throw', async () => {
    await expect(fetchChannelUploads('UCabc', { apiKey: undefined })).rejects.toThrow();
    await expect(fetchChannelUploads('bad', { apiKey: 'k' })).rejects.toThrow();
    const bad = vi.fn<(url: RequestInfo | URL) => Promise<Response>>(async () => ({ ok: false, status: 404 }) as Response);
    await expect(fetchChannelUploads('UCabc', { fetchFn: bad, apiKey: 'k' })).rejects.toThrow('404');
  });
});
