import { describe, it, expect, vi } from 'vitest';
import { fetchContent, NoTranscriptError, type VideoRef } from './fetch-content';

const video: VideoRef = { videoId: 'V1', url: 'https://youtube.com/watch?v=V1' };

describe('fetchContent (C2 자막 우선 → 오디오 폴백)', () => {
  it('자막이 있으면 자막을 쓰고 source=caption (AC-C2.1)', async () => {
    const transcribeAudio = vi.fn();
    const r = await fetchContent(video, {
      getCaption: async () => '자막 텍스트',
      transcribeAudio,
    });
    expect(r).toEqual({ transcript: '자막 텍스트', source: 'caption' });
    expect(transcribeAudio).not.toHaveBeenCalled(); // 폴백 호출 안 함
  });

  it('자막이 없으면 오디오로 폴백하고 source=audio (AC-C2.2)', async () => {
    const r = await fetchContent(video, {
      getCaption: async () => null,
      transcribeAudio: async () => '오디오 전사',
    });
    expect(r).toEqual({ transcript: '오디오 전사', source: 'audio' });
  });

  it('빈 자막도 폴백을 유도한다', async () => {
    const r = await fetchContent(video, {
      getCaption: async () => '   ',
      transcribeAudio: async () => '오디오 전사',
    });
    expect(r.source).toBe('audio');
  });

  it('둘 다 실패하면 NoTranscriptError (AC-C2.3)', async () => {
    await expect(
      fetchContent(video, {
        getCaption: async () => null,
        transcribeAudio: async () => '',
      }),
    ).rejects.toBeInstanceOf(NoTranscriptError);
  });
});
