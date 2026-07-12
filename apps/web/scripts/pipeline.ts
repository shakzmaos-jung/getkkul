import { detectNewVideos, type DetectResult } from '@/lib/pipeline/detect';
import { acquireTranscripts, type AcquireResult } from '@/lib/pipeline/acquire';
import { renewWebSubSubscriptions } from '@/lib/pipeline/websub-subscribe';
import { reconcileChannels } from '@/lib/pipeline/reconcile';
import { runMembershipCycle } from '@/lib/membership/run-cycle';
import { summarizePending } from '@/lib/pipeline/summarize-pending';
import { fillMissingDurations } from '@/lib/pipeline/fill-durations';
import { createNotifier } from '@/lib/notify/create-notifier';
import { createPipelineClient } from '@/lib/pipeline/supabase';
import { recordRun, recordPipelineRun } from '@/lib/pipeline/observability';
import { runStage } from '@/lib/pipeline/run-stage';
import type { Json } from '@/lib/database.types';

/**
 * 처리 파이프라인 진입점 (ADR-0004, GitHub Actions 30분 스케줄).
 * 감지 → 전사 획득 → 요약. 각 단계는 runStage 로 격리 실행되어, 한 단계의 예외가
 * 다음 단계를 막지 않는다(H6). 실패 단계는 pipeline_runs 에 기록되고 최종 요약에 취합된다.
 * 유튜브 봇차단(쿠키 만료)이 다수 감지되면 운영자에게 이메일로 알린다(조용한 중단 방지).
 */
async function alertCookieExpiry(acq: AcquireResult, botBlocks: number) {
  const to = process.env.OPERATOR_ALERT_EMAIL || process.env.GMAIL_USER;
  if (!to) {
    console.warn('[alert] 운영자 이메일 미설정 — 쿠키 만료 알림 생략');
    return;
  }
  try {
    await createNotifier().send(
      { email: to },
      {
        subject: '⚠️ 겠꿀: 유튜브 쿠키 만료 의심 — 갱신 필요',
        text: `파이프라인 전사가 봇차단으로 실패 중입니다 (bot-block ${botBlocks}회, 성공 0 / 실패 ${acq.failed}).\n\nGitHub 시크릿 YOUTUBE_COOKIES 를 새 쿠키로 갱신해 주세요.\n(전용 구글 부계정 쿠키를 쓰면 만료가 덜 잦습니다.)`,
        html: `<div style="font-family:sans-serif"><p><b>겠꿀 파이프라인 알림</b></p><p>유튜브 <b>쿠키 만료</b>로 전사가 실패하고 있습니다. (bot-block ${botBlocks}회 · 성공 0 · 실패 ${acq.failed})</p><p>GitHub 시크릿 <code>YOUTUBE_COOKIES</code> 를 갱신해 주세요. 전용 부계정 쿠키 권장.</p></div>`,
      },
    );
    console.log(`[alert] 쿠키 만료 알림 발송 → ${to}`);
  } catch (e) {
    console.warn(`[alert] 발송 실패: ${(e as Error).message}`);
  }
}

/** 감지 이중화(RSS→API 폴백)가 뚚려 일부 채널을 못 잡으면 운영자에게 알린다(콘텐츠 누락 위험). */
async function alertDetectFailure(det: DetectResult) {
  const to = process.env.OPERATOR_ALERT_EMAIL || process.env.GMAIL_USER;
  if (!to) {
    console.warn('[alert] 운영자 이메일 미설정 — 감지 실패 알림 생략');
    return;
  }
  try {
    await createNotifier().send(
      { email: to },
      {
        subject: '🔴 겠꿀: 채널 감지 실패 — 다이제스트 누락 위험',
        text: `${det.detectFailures}/${det.channels} 채널에서 RSS·API 폴백이 모두 실패했습니다.\n\n해당 채널의 신규 영상이 누락될 수 있습니다. 원인: 쿠키 만료(RSS 404) + YouTube API 키/쿼터 문제일 수 있습니다.\nGitHub 시크릿 YOUTUBE_COOKIES / YOUTUBE_API_KEY 를 확인해 주세요.`,
        html: `<div style="font-family:sans-serif"><p><b>겠꿀 파이프라인 알림</b></p><p><b>${det.detectFailures}/${det.channels} 채널</b>에서 RSS·API 폴백이 <b>모두 실패</b>했습니다 → 해당 채널 신규 영상 <b>누락 위험</b>.</p><p>원인: 쿠키 만료(RSS 404) + YouTube API 키/쿼터. <code>YOUTUBE_COOKIES</code> / <code>YOUTUBE_API_KEY</code> 확인 요망.</p></div>`,
      },
    );
    console.log(`[alert] 감지 실패 알림 발송 → ${to}`);
  } catch (e) {
    console.warn(`[alert] 발송 실패: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('[pipeline] start');
  const supabase = createPipelineClient();
  const pipelineStarted = new Date().toISOString();
  const failures: string[] = [];

  const det = await runStage(
    'detect',
    () => recordRun(supabase, 'detect', () => detectNewVideos()),
    { channels: 0, registered: 0, detectFailures: 0 },
    failures,
  );
  console.log(
    `[detect] channels=${det.channels} registered=${det.registered} detectFailures=${det.detectFailures}`,
  );

  // RSS·API 폴백 둘 다 실패한 채널이 하나라도 있으면 알림(감지 이중화가 뚚린 것 = 누락 위험).
  if (det.detectFailures > 0) {
    await alertDetectFailure(det);
  }

  // WebSub 구독 유지(신규 채널 구독 + 만료 임박 갱신). 시크릿 없으면 no-op.
  const ws = await runStage(
    'websub',
    () => recordRun(supabase, 'websub', () => renewWebSubSubscriptions()),
    { channels: 0, subscribed: 0, skipped: 0, failed: 0 },
    failures,
  );
  console.log(
    `[websub] channels=${ws.channels} subscribed=${ws.subscribed} skipped=${ws.skipped} failed=${ws.failed}`,
  );

  const acq = await runStage(
    'acquire',
    () => recordRun(supabase, 'acquire', () => acquireTranscripts()),
    { processed: 0, done: 0, failed: 0, rescheduled: 0, skipped: 0, botBlocks: 0 },
    failures,
  );
  console.log(
    `[acquire] processed=${acq.processed} done=${acq.done} failed=${acq.failed} rescheduled=${acq.rescheduled} skipped=${acq.skipped}`,
  );

  // 봇차단이 다수(≈영상 1개 이상, 재시도 포함)이고 성공이 0이면 쿠키 만료로 보고 알림.
  // botBlocks 는 acquire 결과로 전달됨(모듈 전역 대신 — 격리 경계 유지, C3).
  if (acq.botBlocks >= 5 && acq.done === 0) {
    await alertCookieExpiry(acq, acq.botBlocks);
  }

  // 요약 앞에서 duration 을 먼저 채운다 → 정식 영상은 길이 확보, 남은 NULL(라이브/예정/삭제)만 요약 제외.
  const dur = await runStage(
    'duration',
    () => recordRun(supabase, 'duration', () => fillMissingDurations()),
    { filled: 0, targets: 0 },
    failures,
  );
  console.log(`[duration] filled=${dur.filled}/${dur.targets}`);

  const sum = await runStage(
    'summarize',
    () => recordRun(supabase, 'summarize', () => summarizePending()),
    { videos: 0, generated: 0, prompt_tokens: 0, completion_tokens: 0, calls: 0 },
    failures,
  );
  console.log(`[summarize] videos=${sum.videos} generated=${sum.generated}`);

  // 자가치유 백필(하루 1회 셀프 게이트): WebSub·폴링이 놓친 영상까지 회복(REQ-E).
  const rec = await runStage(
    'reconcile',
    () => reconcileChannels({ supabase }),
    { ran: false as boolean, channels: 0, backfilled: 0, failed: 0 },
    failures,
  );
  if (rec.ran) {
    console.log(`[reconcile] channels=${rec.channels} backfilled=${rec.backfilled} failed=${rec.failed}`);
  }

  // 멤버십 주기 전환(결제·PoC 종료·유예·7일전 안내). 멱등 — 매 런 안전.
  await runStage(
    'membership',
    async () => {
      const mem = await runMembershipCycle();
      if (mem.transitions > 0 || mem.warned > 0) {
        console.log(`[membership] transitions=${mem.transitions} warned=${mem.warned}`);
      }
      return mem;
    },
    null,
    failures,
  );

  const ok = failures.length === 0;
  await recordPipelineRun(
    supabase,
    pipelineStarted,
    { det, acq, ws, dur, sum, rec, stageFailures: failures } as unknown as Json,
    ok,
  );
  console.log(`[pipeline] done${ok ? '' : ` — 실패 단계(격리): ${failures.join(', ')}`}`);

  // 단계 격리로 잡 자체는 계속되지만, 실패가 있으면 프로세스를 비정상 종료해
  // GitHub Actions/모니터링이 인지하게 한다(조용한 실패 방지).
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error('[pipeline] fatal:', e);
  process.exit(1);
});
