import { createPipelineClient } from '@/lib/pipeline/supabase';
import { createNotifier } from '@/lib/notify/create-notifier';
import { buildReport, type HealthSnapshot } from '@/lib/pipeline/health-check';

/**
 * 파이프라인 자동 점검 (gk_pipeline_check). 탐지·전사·요약·발송 4단계 건강 상태를
 * DB 스냅샷(`pipeline_health_snapshot()`)으로 모아 판정하고, 운영자에게 이메일로 리포트한다.
 * 하루 8회(KST 08/10/12/14/16/18/20/22) pg_cron→GitHub Actions 로 실행(ADR-0016).
 *
 * --no-email (또는 PIPELINE_CHECK_NO_EMAIL=1): 이메일 생략, stdout 리포트만(스킬 온디맨드용).
 * 수신처: PIPELINE_CHECK_EMAIL ?? OPERATOR_ALERT_EMAIL ?? 'shakzmaos@gmail.com'.
 */
const DEFAULT_RECIPIENT = 'shakzmaos@gmail.com';

async function main() {
  const noEmail = process.argv.includes('--no-email') || process.env.PIPELINE_CHECK_NO_EMAIL === '1';
  const supabase = createPipelineClient();

  const { data, error } = await supabase.rpc('pipeline_health_snapshot');
  if (error) throw new Error(`snapshot rpc 실패: ${error.message}`);
  const snapshot = data as unknown as HealthSnapshot;

  const report = buildReport(snapshot);

  // 리포트는 항상 stdout 에 남긴다(Actions 로그·스킬 공용).
  console.log(report.subject);
  console.log(report.text);

  if (noEmail) {
    console.log('[pipeline-check] --no-email — 이메일 생략');
    return;
  }

  const to = process.env.PIPELINE_CHECK_EMAIL || process.env.OPERATOR_ALERT_EMAIL || DEFAULT_RECIPIENT;
  try {
    const res = await createNotifier().send(
      { email: to },
      { subject: report.subject, text: report.text, html: report.html },
    );
    console.log(`[pipeline-check] 리포트 발송 → ${to}${res.id ? ` (${res.id})` : ''}`);
  } catch (e) {
    // 발송 실패가 점검 잡을 죽이지 않도록 격리(로그만).
    console.warn(`[pipeline-check] 발송 실패: ${(e as Error).message}`);
  }
}

main().catch((e) => {
  console.error('[pipeline-check] fatal:', e);
  process.exit(1);
});
