import { detectNewVideos, type DetectResult } from '@/lib/pipeline/detect';
import { acquireTranscripts, type AcquireResult } from '@/lib/pipeline/acquire';
import { summarizePending } from '@/lib/pipeline/summarize-pending';
import { fillMissingDurations } from '@/lib/pipeline/fill-durations';
import { getBotBlockCount } from '@/lib/pipeline/youtube-content';
import { createNotifier } from '@/lib/notify/create-notifier';

/**
 * 처리 파이프라인 진입점 (ADR-0004, GitHub Actions 30분 스케줄).
 * 감지 → 전사 획득 → 요약. 각 단계 실패가 다음을 막지 않도록 방어적으로 실행한다(H6).
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
        subject: '⚠️ 겟꿀: 유튜브 쿠키 만료 의심 — 갱신 필요',
        text: `파이프라인 전사가 봇차단으로 실패 중입니다 (bot-block ${botBlocks}회, 성공 0 / 실패 ${acq.failed}).\n\nGitHub 시크릿 YOUTUBE_COOKIES 를 새 쿠키로 갱신해 주세요.\n(전용 구글 부계정 쿠키를 쓰면 만료가 덜 잦습니다.)`,
        html: `<div style="font-family:sans-serif"><p><b>겟꿀 파이프라인 알림</b></p><p>유튜브 <b>쿠키 만료</b>로 전사가 실패하고 있습니다. (bot-block ${botBlocks}회 · 성공 0 · 실패 ${acq.failed})</p><p>GitHub 시크릿 <code>YOUTUBE_COOKIES</code> 를 갱신해 주세요. 전용 부계정 쿠키 권장.</p></div>`,
      },
    );
    console.log(`[alert] 쿠키 만료 알림 발송 → ${to}`);
  } catch (e) {
    console.warn(`[alert] 발송 실패: ${(e as Error).message}`);
  }
}

/** RSS 감지가 다수 실패(데이터센터 IP 차단 404/429·쿠키만료)하면 운영자에게 알린다. */
async function alertRssBlocked(det: DetectResult) {
  const to = process.env.OPERATOR_ALERT_EMAIL || process.env.GMAIL_USER;
  if (!to) {
    console.warn('[alert] 운영자 이메일 미설정 — RSS 차단 알림 생략');
    return;
  }
  try {
    await createNotifier().send(
      { email: to },
      {
        subject: '⚠️ 겟꿀: RSS 감지 차단 의심 — 신규 콘텐츠 미갱신',
        text: `유튜브 RSS 폴링이 다수 실패했습니다 (${det.rssFailures}/${det.channels} 채널 실패, 신규 감지 0).\n\n데이터센터 IP 차단(404/429) 또는 쿠키 만료 가능성입니다. GitHub 시크릿 YOUTUBE_COOKIES 갱신을 확인하고, 지속되면 residential 실행환경 전환을 검토해 주세요.`,
        html: `<div style="font-family:sans-serif"><p><b>겟꿀 파이프라인 알림</b></p><p>유튜브 <b>RSS 감지가 차단</b>돼 신규 콘텐츠가 갱신되지 않고 있습니다. (${det.rssFailures}/${det.channels} 채널 실패 · 신규 감지 0)</p><p>데이터센터 IP 차단(404/429) 또는 쿠키 만료 가능성. <code>YOUTUBE_COOKIES</code> 갱신 확인, 지속 시 residential 실행환경 검토.</p></div>`,
      },
    );
    console.log(`[alert] RSS 차단 알림 발송 → ${to}`);
  } catch (e) {
    console.warn(`[alert] 발송 실패: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('[pipeline] start');

  const det = await detectNewVideos();
  console.log(`[detect] channels=${det.channels} registered=${det.registered} rssFailures=${det.rssFailures}`);

  // RSS 절반 이상 실패 + 신규 감지 0 이면 IP 차단/쿠키만료로 보고 알림(일부 일시적 404 는 무시).
  if (det.channels > 0 && det.rssFailures >= Math.ceil(det.channels * 0.5) && det.registered === 0) {
    await alertRssBlocked(det);
  }

  const acq = await acquireTranscripts();
  console.log(`[acquire] processed=${acq.processed} done=${acq.done} failed=${acq.failed}`);

  // 봇차단이 다수(≈영상 1개 이상, 재시도 포함)이고 성공이 0이면 쿠키 만료로 보고 알림
  const botBlocks = getBotBlockCount();
  if (botBlocks >= 5 && acq.done === 0) {
    await alertCookieExpiry(acq, botBlocks);
  }

  // 요약 앞에서 duration 을 먼저 채운다 → 정식 영상은 길이 확보, 남은 NULL(라이브/예정/삭제)만 요약 제외.
  const dur = await fillMissingDurations();
  console.log(`[duration] filled=${dur.filled}/${dur.targets}`);

  const sum = await summarizePending();
  console.log(`[summarize] videos=${sum.videos} generated=${sum.generated}`);

  console.log('[pipeline] done');
}

main().catch((e) => {
  console.error('[pipeline] fatal:', e);
  process.exit(1);
});
