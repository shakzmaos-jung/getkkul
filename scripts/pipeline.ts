import { detectNewVideos } from '@/lib/pipeline/detect';
import { acquireTranscripts } from '@/lib/pipeline/acquire';
import { summarizePending } from '@/lib/pipeline/summarize-pending';

/**
 * 처리 파이프라인 진입점 (ADR-0004, GitHub Actions 30분 스케줄).
 * 감지 → 전사 획득. 이후 M4 요약이 이 뒤에 붙는다.
 * 각 단계 실패가 다음을 막지 않도록 방어적으로 실행한다(H6).
 */
async function main() {
  console.log('[pipeline] start');

  const det = await detectNewVideos();
  console.log(`[detect] channels=${det.channels} registered=${det.registered}`);

  const acq = await acquireTranscripts();
  console.log(`[acquire] processed=${acq.processed} done=${acq.done} failed=${acq.failed}`);

  const sum = await summarizePending();
  console.log(`[summarize] videos=${sum.videos} generated=${sum.generated}`);

  console.log('[pipeline] done');
}

main().catch((e) => {
  console.error('[pipeline] fatal:', e);
  process.exit(1);
});
