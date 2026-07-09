import { describe, it, expect, vi } from 'vitest';
import { fetchChannelUploads, fetchChannelUploadsPaged } from './channel-uploads';

function page(items: string[], nextPageToken?: string): Response {
  return {
    ok: true,
    json: async () => ({
      items: items.map((id) => ({
        contentDetails: { videoId: id, videoPublishedAt: '2026-07-09T00:00:00Z' },
        snippet: { title: `t-${id}` },
      })),
      nextPageToken,
    }),
  } as unknown as Response;
}

describe('fetchChannelUploadsPaged (REQ-E 백필 페이지네이션)', () => {
  it('nextPageToken 을 따라 여러 페이지를 이어붙이고 토큰 소진 시 중단', async () => {
    const pages = [page(['a', 'b'], 'p2'), page(['c', 'd'], 'p3'), page(['e'])];
    let i = 0;
    const fetchFn = vi.fn<typeof fetch>(async () => pages[i++]);
    const out = await fetchChannelUploadsPaged('UC_x', 5, { fetchFn, apiKey: 'k' });
    expect(out.map((v) => v.videoId)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('maxPages 에서 멈춘다', async () => {
    const pages = [page(['a'], 'p2'), page(['b'], 'p3'), page(['c'], 'p4')];
    let i = 0;
    const fetchFn = vi.fn<typeof fetch>(async () => pages[i++]);
    const out = await fetchChannelUploadsPaged('UC_x', 2, { fetchFn, apiKey: 'k' });
    expect(out.map((v) => v.videoId)).toEqual(['a', 'b']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('다음 페이지 요청에 pageToken 을 싣는다', async () => {
    const pages = [page(['a'], 'TOKEN2'), page(['b'])];
    let i = 0;
    const fetchFn = vi.fn<typeof fetch>(async () => pages[i++]);
    await fetchChannelUploadsPaged('UC_x', 5, { fetchFn, apiKey: 'k' });
    expect(String(fetchFn.mock.calls[1][0])).toContain('pageToken=TOKEN2');
  });
});

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
