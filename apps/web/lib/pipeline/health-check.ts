/**
 * 파이프라인 건강 점검 — 판정·리포트 렌더(순수). 데이터 수집은 DB 함수
 * `pipeline_health_snapshot()` 가 담당하고, 여기서는 그 스냅샷을 받아 ✅/⚠️ 판정과
 * 이메일 본문(text/html)을 만든다. IO 없음 → 단위 테스트 대상.
 *
 * 오탐 방지 원칙: 모든 backlog 신호는 콘텐츠 컷오프(2026-07-10) 이후만 본다.
 * 신규 구독 채널의 과거 영상(dead data)은 절대 알람 대상이 아니다(참고 정보로만 표기).
 */

/** 파이프라인 런이 이 분(minute)보다 오래 안 돌면 스케줄러 정지 의심. */
export const STALE_PIPELINE_MINUTES = 60;
/** post-cutoff 영상 실패가 이 수를 넘으면 개별 영구실패가 아니라 이상 급증으로 본다. */
export const FAILED_VIDEO_ALERT_THRESHOLD = 10;

export interface HealthSnapshot {
  nowKst: string;
  lastPipelineRunAgeMin: number | null;
  failedRuns: { kind: string; error: string; atKst: string }[];
  detectFailures: number;
  acquireFailed3h: number;
  cookieExpirySuspected: boolean;
  failedVideosPostCutoff: { count: number; samples: { title: string; error: string }[] };
  eligibleUnsummarized: number;
  deliveryFailures24h: number;
  deadDataPending: number;
  today: { detected: number; summarized: number; delivered: number };
  summarizedRecentMedian: number;
}

export interface HealthReport {
  ok: boolean;
  issues: string[];
  subject: string;
  text: string;
  html: string;
}

/** 스냅샷 → 이상 목록(비어 있으면 정상). */
export function evaluateIssues(s: HealthSnapshot): string[] {
  const issues: string[] = [];
  if (s.lastPipelineRunAgeMin === null) {
    issues.push('파이프라인 런 기록 없음 — 스케줄러 미동작 의심');
  } else if (s.lastPipelineRunAgeMin > STALE_PIPELINE_MINUTES) {
    issues.push(
      `파이프라인 런 지연: 마지막 실행 ${Math.round(s.lastPipelineRunAgeMin)}분 전 (임계 ${STALE_PIPELINE_MINUTES}분) — pg_cron/Actions 확인`,
    );
  }
  for (const r of s.failedRuns) {
    issues.push(`런 실패(${r.kind}, ${r.atKst}): ${r.error}`);
  }
  if (s.detectFailures > 0) {
    issues.push(`채널 감지 실패 ${s.detectFailures}건 — 쿠키/API 키 확인(신규 영상 누락 위험)`);
  }
  if (s.cookieExpirySuspected) {
    issues.push('전사 봇차단 다발 + 성공 0 — 유튜브 쿠키 만료 의심(YOUTUBE_COOKIES 갱신)');
  }
  if (s.eligibleUnsummarized > 0) {
    issues.push(`요약 누락 ${s.eligibleUnsummarized}건 — 전사 완료·길이 적합인데 요약 미생성(요약 단계 확인)`);
  }
  if (s.failedVideosPostCutoff.count >= FAILED_VIDEO_ALERT_THRESHOLD) {
    issues.push(`최근 24h 신규 영상 실패 급증 ${s.failedVideosPostCutoff.count}건 — 전사 파이프라인 확인`);
  }
  if (s.deliveryFailures24h > 0) {
    issues.push(`발송 실패 ${s.deliveryFailures24h}건(status≠sent) — 이메일/푸시 전송 확인`);
  }
  return issues;
}

function stage(ok: boolean, name: string, detail: string): string {
  return `${ok ? '✅' : '⚠️'} ${name} — ${detail}`;
}

/** 스냅샷 → 완성 리포트(제목·text·html). */
export function buildReport(s: HealthSnapshot): HealthReport {
  const issues = evaluateIssues(s);
  const ok = issues.length === 0;

  const ageTxt = s.lastPipelineRunAgeMin === null ? '기록 없음' : `${Math.round(s.lastPipelineRunAgeMin)}분 전`;
  const detectOk = s.detectFailures === 0 && s.lastPipelineRunAgeMin !== null && s.lastPipelineRunAgeMin <= STALE_PIPELINE_MINUTES;
  const acquireOk = !s.cookieExpirySuspected && s.failedVideosPostCutoff.count < FAILED_VIDEO_ALERT_THRESHOLD;
  const summarizeOk = s.eligibleUnsummarized === 0;
  const deliveryOk = s.deliveryFailures24h === 0;

  const stages = [
    stage(detectOk, '탐지', `감지 실패 ${s.detectFailures}건 · 마지막 런 ${ageTxt}`),
    stage(
      acquireOk,
      '전사',
      `최근 3h 실패 ${s.acquireFailed3h} · 봇차단 의심 ${s.cookieExpirySuspected ? '예' : '아니오'} · 영구실패(참고) ${s.failedVideosPostCutoff.count}`,
    ),
    stage(summarizeOk, '요약', `미요약 대상 ${s.eligibleUnsummarized}건 · 오늘 요약 ${s.today.summarized}건`),
    stage(deliveryOk, '발송', `발송 실패 ${s.deliveryFailures24h}건 · 오늘 발송 ${s.today.delivered}건`),
  ];

  const throughput = `오늘 처리량 — 신규 감지 ${s.today.detected} · 요약 ${s.today.summarized} · 발송 ${s.today.delivered} (최근 요약 중앙값 ${s.summarizedRecentMedian}/일)`;
  const deadNote = `참고: 처리대상 아닌 과거 영상(컷오프 이전) pending ${s.deadDataPending}건 — 설계상 요약 안 함(정상).`;

  const statusLine = ok ? '✅ 정상' : `⚠️ 이상 ${issues.length}건`;
  const subject = ok
    ? `[겟꿀 점검] ✅ 정상 (${s.nowKst})`
    : `[겟꿀 점검] ⚠️ 이상 ${issues.length}건 — ${shorten(issues[0], 40)} (${s.nowKst})`;

  const textParts = [
    `겟꿀 파이프라인 점검 — ${statusLine} (${s.nowKst} KST)`,
    '',
    ...stages,
    '',
    throughput,
    deadNote,
  ];
  if (!ok) {
    textParts.push('', '── 이상 목록 ──', ...issues.map((i, n) => `${n + 1}. ${i}`));
  }
  const text = textParts.join('\n');

  const html = renderHtml(s, statusLine, ok, stages, throughput, deadNote, issues);
  return { ok, issues, subject, text, html };
}

function shorten(v: string, n: number): string {
  return v.length <= n ? v : `${v.slice(0, n - 1)}…`;
}

function esc(v: string): string {
  return v.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function renderHtml(
  s: HealthSnapshot,
  statusLine: string,
  ok: boolean,
  stages: string[],
  throughput: string,
  deadNote: string,
  issues: string[],
): string {
  const stageRows = stages.map((st) => `<li style="margin:4px 0">${esc(st)}</li>`).join('');
  const issueBlock = ok
    ? ''
    : `<h3 style="margin:16px 0 6px;color:#b00">이상 목록</h3><ol style="margin:0;padding-left:20px">${issues
        .map((i) => `<li style="margin:4px 0">${esc(i)}</li>`)
        .join('')}</ol>`;
  const failSamples =
    s.failedVideosPostCutoff.samples.length > 0
      ? `<p style="color:#888;font-size:12px;margin:8px 0 0">영구실패 예시: ${s.failedVideosPostCutoff.samples
          .map((v) => esc(shorten(v.title, 40)))
          .join(', ')}</p>`
      : '';
  return `<div style="font-family:-apple-system,sans-serif;max-width:640px">
    <p style="font-size:16px;font-weight:700;margin:0 0 4px">겟꿀 파이프라인 점검 — ${esc(statusLine)}</p>
    <p style="color:#888;font-size:12px;margin:0 0 12px">${esc(s.nowKst)} KST</p>
    <ul style="list-style:none;padding:0;margin:0;font-size:14px">${stageRows}</ul>
    <p style="font-size:13px;margin:12px 0 0">${esc(throughput)}</p>
    <p style="color:#888;font-size:12px;margin:6px 0 0">${esc(deadNote)}</p>
    ${failSamples}
    ${issueBlock}
  </div>`;
}
