/**
 * 콘텐츠 획득 격리 인터페이스 (SSR AC-C2.5, CLAUDE.md 격리 경계 ①).
 * 자막 우선 → 오디오 STT 폴백. 실제 구현(yt-dlp/Whisper)은 주입받아 교체 가능.
 * 이 오케스트레이션 자체는 순수하게 유지해 단위 테스트한다.
 */

export interface VideoRef {
  videoId: string;
  url: string;
}

export interface FetchedContent {
  transcript: string;
  source: 'caption' | 'audio';
}

export interface ContentFetchDeps {
  /** 자막 텍스트 (없으면 null → 오디오 폴백). */
  getCaption: (video: VideoRef) => Promise<string | null>;
  /** 오디오 STT 전사 텍스트. */
  transcribeAudio: (video: VideoRef) => Promise<string>;
}

export class NoTranscriptError extends Error {
  constructor(videoId: string) {
    super(`전사를 확보하지 못했습니다: ${videoId}`);
    this.name = 'NoTranscriptError';
  }
}

export async function fetchContent(
  video: VideoRef,
  deps: ContentFetchDeps,
): Promise<FetchedContent> {
  const caption = await deps.getCaption(video); // AC-C2.1
  if (caption && caption.trim()) {
    return { transcript: caption.trim(), source: 'caption' };
  }

  const audio = await deps.transcribeAudio(video); // AC-C2.2
  if (audio && audio.trim()) {
    return { transcript: audio.trim(), source: 'audio' };
  }

  throw new NoTranscriptError(video.videoId); // AC-C2.3
}
