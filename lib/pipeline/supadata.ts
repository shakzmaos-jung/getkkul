import type { VideoRef } from '@/lib/pipeline/fetch-content';

/**
 * 관리형 트랜스크립트 API 폴백 (pipeline-reliability REQ-C). Supadata.
 * GET https://api.supadata.ai/v1/transcript?url=..&lang=ko&text=true&mode=auto (x-api-key).
 * 200: { content, lang } · 202: { jobId } → GET /transcript/{jobId} 폴링(completed/failed).
 *
 * `getCaption` 티어의 폴백으로 합성한다(yt-dlp 실패 시 시도). 키(SUPADATA_API_KEY)가 없으면
 * no-op(null) — 배포는 미리 하고 키 등록 시 자동 활성화. 계약 상 실패는 조용히 null(상위가 폴백/재시도).
 */

const BASE = 'https://api.supadata.ai/v1';
const POLL_MAX = 20; // 최대 폴링 횟수(≈1분)
const POLL_INTERVAL_MS = 3000;

interface SupadataDeps {
  apiKey?: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export async function supadataCaption(
  video: VideoRef,
  deps: SupadataDeps = {},
): Promise<string | null> {
  const apiKey = deps.apiKey ?? process.env.SUPADATA_API_KEY;
  if (!apiKey) return null; // 키 없으면 폴백 비활성
  const doFetch = deps.fetchFn ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const headers = { 'x-api-key': apiKey };
  const url = `${BASE}/transcript?url=${encodeURIComponent(video.url)}&lang=ko&text=true&mode=auto`;

  try {
    const res = await doFetch(url, { headers });

    if (res.status === 200) {
      const j = (await res.json()) as { content?: string };
      return j.content && j.content.trim() ? j.content.trim() : null;
    }

    if (res.status === 202) {
      const { jobId } = (await res.json()) as { jobId?: string };
      if (!jobId) return null;
      for (let i = 0; i < POLL_MAX; i++) {
        await sleep(POLL_INTERVAL_MS);
        const jr = await doFetch(`${BASE}/transcript/${jobId}`, { headers });
        if (jr.status !== 200) continue;
        const jj = (await jr.json()) as { status?: string; content?: string };
        if (jj.status === 'completed') {
          return jj.content && jj.content.trim() ? jj.content.trim() : null;
        }
        if (jj.status === 'failed') return null;
      }
      return null; // 폴링 타임아웃
    }

    // 404(비공개/삭제)·403·206(자막 없음) 등 → 폴백 실패로 null(상위 yt-dlp 오류가 영구/일시 분류를 주도).
    return null;
  } catch (e) {
    console.warn(`[supadata] ${video.videoId}: ${(e as Error).message}`);
    return null;
  }
}
