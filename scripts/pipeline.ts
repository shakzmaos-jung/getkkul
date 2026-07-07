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

/** 감지 이중화(RSS→API 폴백)가 뚫려 일부 채널을 못 잡으면 운영자에게 알린다(콘텐츠 누락 위험). */
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
        subject: '🔴 겟꿀: 채널 감지 실패 — 다이제스트 누락 위험',
        text: `${det.detectFailures}/${det.channels} 채널에서 RSS·API 폴백이 모두 실패했습니다.\n\n해당 채널의 신규 영상이 누락될 수 있습니다. 원인: 쿠키 만료(RSS 404) + YouTube API 키/쿼터 문제일 수 있습니다.\nGitHub 시크릿 YOUTUBE_COOKIES / YOUTUBE_API_KEY 를 확인해 주세요.`,
        html: `<div style="font-family:sans-serif"><p><b>겟꿀 파이프라인 알림</b></p><p><b>${det.detectFailures}/${det.channels} 채널</b>에서 RSS·API 폴백이 <b>모두 실패</b>했습니다 → 해당 채널 신규 영상 <b>누락 위험</b>.</p><p>원인: 쿠키 만료(RSS 404) + YouTube API 키/쿼터. <code>YOUTUBE_COOKIES</code> / <code>YOUTUBE_API_KEY</code> 확인 요망.</p></div>`,
      },
    );
    console.log(`[alert] 감지 실패 알림 발송 → ${to}`);
  } catch (e) {
    console.warn(`[alert] 발송 실패: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('[pipeline] start');

  const det = await detectNewVideos();
  console.log(
    `[detect] channels=${det.channels} registered=${det.registered} detectFailures=${det.detectFailures}`,
  );

  // RSS·API 폴백 둘 다 실패한 채널이 하나라도 있으면 알림(감지 이중화가 뚫린 것 = 누락 위험).
  if (det.detectFailures > 0) {
    await alertDetectFailure(det);
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
