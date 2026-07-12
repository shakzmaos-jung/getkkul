import { createPipelineClient } from '@/lib/pipeline/supabase';
import { fetchVideoDurations } from '@/lib/youtube/fetch-durations';

/**
 * 일회성/재실행 가능 백필: duration_seconds 가 NULL 인 영상의 길이를
 * YouTube Data API 로 채운다. idempotent(NULL 만 대상). 신규 영상은 detect 가 채우므로
 * 이 스크립트는 기존 백로그 보정용.
 * 실행: node --env-file=.env.local node_modules/.bin/tsx scripts/backfill-durations.ts
 */
async function main() {
  const supabase = createPipelineClient();
  const { data, error } = await supabase
    .from('videos')
    .select('video_id')
    .is('duration_seconds', null);
  if (error) throw new Error(`대상 조회 실패: ${error.message}`);

  const ids = (data ?? []).map((r) => r.video_id);
  console.log(`[backfill] NULL 대상: ${ids.length}`);
  if (ids.length === 0) return;

  const durations = await fetchVideoDurations(ids);
  console.log(`[backfill] API 확보: ${durations.size}/${ids.length}`);

  let updated = 0;
  for (const [videoId, sec] of durations) {
    const { error: uErr } = await supabase
      .from('videos')
      .update({ duration_seconds: sec })
      .eq('video_id', videoId);
    if (uErr) console.warn(`[backfill] ${videoId} 업데이트 실패: ${uErr.message}`);
    else updated++;
  }
  console.log(`[backfill] 업데이트 완료: ${updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
