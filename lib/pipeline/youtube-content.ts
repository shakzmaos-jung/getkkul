import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vttToText } from '@/lib/pipeline/vtt';
import { isBotBlockError } from '@/lib/pipeline/health';
import type { VideoRef } from '@/lib/pipeline/fetch-content';

// 이번 실행에서 관찰된 유튜브 봇차단(쿠키 만료) 횟수. 파이프라인이 만료 알림 판단에 사용.
let botBlockCount = 0;
export function getBotBlockCount(): number {
  return botBlockCount;
}

/**
 * fetchContent 의 실제 구현 (ADR-0004). yt-dlp(자막·오디오) + OpenAI Whisper.
 * GitHub Actions 러너(yt-dlp/ffmpeg 설치됨)에서 실행된다. 단위 테스트 대상 아님(바이너리 의존).
 */

const execFileAsync = promisify(execFile);

/**
 * 데이터센터 IP(GitHub Actions)는 YouTube 봇차단에 걸리므로, 로그인 쿠키로 우회한다.
 * YTDLP_COOKIES_FILE 가 비어있지 않은 파일을 가리키면 --cookies 로 전달한다.
 */
function cookieArgs(): string[] {
  const f = process.env.YTDLP_COOKIES_FILE;
  if (f && existsSync(f) && statSync(f).size > 0) return ['--cookies', f];
  return [];
}

// 우선순위 언어. 한 번에 여러 언어를 요청하면 자막 다운로드가 폭주해 YouTube 429 를
// 유발하므로, 언어를 하나씩 순차 시도하고 첫 성공에서 멈춘다.
const CAPTION_LANGS = ['ko', 'en'];

async function captionForLang(video: VideoRef, lang: string): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), 'gk-cap-'));
  try {
    await execFileAsync(
      'yt-dlp',
      [
        '--skip-download',
        ...cookieArgs(),
        '--write-subs', // 수동 자막 우선
        '--write-auto-subs', // 없으면 자동자막
        '--sub-langs',
        lang,
        '--sub-format',
        'vtt',
        '--convert-subs',
        'vtt',
        '-o',
        join(dir, '%(id)s.%(ext)s'),
        video.url,
      ],
      { timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
    const vtt = (await readdir(dir)).find((f) => f.endsWith('.vtt'));
    if (!vtt) return null;
    const text = vttToText(await readFile(join(dir, vtt), 'utf8'));
    return text || null;
  } catch (e) {
    const msg = (e as Error).message;
    if (isBotBlockError(msg)) botBlockCount++;
    console.warn(`[caption] ${video.videoId} (${lang}): ${msg}`);
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** 자막 우선 획득. ko→en 순차 시도, 없으면 null 로 오디오 폴백 유도. */
export async function ytdlpCaption(video: VideoRef): Promise<string | null> {
  for (const lang of CAPTION_LANGS) {
    const text = await captionForLang(video, lang);
    if (text) return text;
  }
  return null;
}

/** 오디오 추출 → OpenAI Whisper 전사. (Whisper 파일 한도 25MB — 매우 긴 영상은 v1 한계) */
export async function whisperAudio(video: VideoRef): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 가 필요합니다.');

  const dir = await mkdtemp(join(tmpdir(), 'gk-aud-'));
  try {
    await execFileAsync(
      'yt-dlp',
      ['-x', ...cookieArgs(), '--audio-format', 'mp3', '--audio-quality', '5', '-o', join(dir, '%(id)s.%(ext)s'), video.url],
      { timeout: 300_000, maxBuffer: 32 * 1024 * 1024 },
    );

    const mp3 = (await readdir(dir)).find((f) => f.endsWith('.mp3'));
    if (!mp3) throw new Error('오디오 추출 실패');

    const buf = await readFile(join(dir, mp3));
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf)], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`Whisper ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { text: string };
    return json.text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
