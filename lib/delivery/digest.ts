import { SLOT_CODES, type SlotCode } from '@/lib/time';
import type { NotifyMessage } from '@/lib/notify/notify';

/**
 * 다이제스트 구성 순수 로직 (SSR REQ-E2, F1.2). 단위 테스트 대상.
 */

export const MAX_DIGEST_ITEMS = 30; // AC-E2.4

export interface DigestVideo {
  videoId: string;
  title: string;
  url: string;
  headline: string;
  coreText: string;
  durationSeconds?: number | null;
}

export interface DigestSelection {
  items: DigestVideo[];
  overflow: number; // 이월 개수
}

/** 다이제스트당 최대 30개, 초과분은 이월(AC-E2.4). 오래된 것부터 담는다고 가정(호출자가 정렬). */
export function selectDigestVideos(
  candidates: DigestVideo[],
  maxItems: number = MAX_DIGEST_ITEMS,
): DigestSelection {
  return {
    items: candidates.slice(0, maxItems),
    overflow: Math.max(0, candidates.length - maxItems),
  };
}

/** 슬롯별 KST 분(minute-of-day). 07:30=450 / 11:30=690 / 17:30=1050 / 21:30=1290. */
const SLOT_MINUTES: Record<SlotCode, number> = {
  '0730': 450,
  '1130': 690,
  '1730': 1050,
  '2130': 1290,
};

/**
 * 발송 슬롯 허용 오차(분). pg_cron 정시 디스패치(+1-2분)는 통과하고,
 * 지연 크론·수동 실행 같은 off-slot 은 차단하는 경계값.
 */
export const SLOT_TOLERANCE_MIN = 10;

/**
 * 현재 시각(KST)에서 가장 가까운 발송 슬롯과 그 거리를 판정한다(07:30/11:30/17:30/21:30).
 * 최근접 방식이라 '시' 버킷팅의 경계 오라벨이 없다.
 * withinWindow=false 면 off-slot 실행 → 호출자가 발송을 스킵한다.
 */
export function resolveDeliverySlot(now: Date): {
  slot: SlotCode;
  offsetMin: number;
  withinWindow: boolean;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  // hour12:false 는 자정을 '24' 로 주는 구현이 있어 24→0 정규화.
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const nowMin = hh * 60 + mm;

  let slot: SlotCode = '0730';
  let offsetMin = Infinity;
  for (const code of SLOT_CODES) {
    const dist = Math.abs(nowMin - SLOT_MINUTES[code]);
    if (dist < offsetMin) {
      offsetMin = dist;
      slot = code;
    }
  }
  return { slot, offsetMin, withinWindow: offsetMin <= SLOT_TOLERANCE_MIN };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 다이제스트 이메일 메시지 렌더링. 빈 목록은 "새 소식 없음"(AC-E2.3). */
export function renderDigest(
  selection: DigestSelection,
  opts: { appBaseUrl?: string } = {},
): NotifyMessage {
  const { items, overflow } = selection;
  const appBaseUrl = opts.appBaseUrl ?? 'https://getkkul.vercel.app';

  if (items.length === 0) {
    return {
      subject: '겟꿀 · 새 소식 없음',
      text: '이번 시간에는 새로 준비된 영상이 없습니다.',
      html: '<p>이번 시간에는 새로 준비된 영상이 없습니다.</p>',
    };
  }

  const subject = `겟꿀 · 새 소식 ${items.length}개`;

  const textParts = items.map(
    (v) => `▶ ${v.headline}\n${v.coreText}\n원본: ${v.url}`,
  );
  if (overflow > 0) textParts.push(`(외 ${overflow}개는 다음 발송에 이어집니다)`);
  const text = textParts.join('\n\n');

  const htmlItems = items
    .map(
      (v) => `
      <li style="margin-bottom:16px">
        <a href="${escapeHtml(v.url)}" style="font-weight:600;font-size:16px">${escapeHtml(v.headline)}</a>
        <p style="margin:6px 0;color:#374151">${escapeHtml(v.coreText)}</p>
        <a href="${escapeHtml(v.url)}" style="font-size:13px;color:#6b7280">원본 영상 →</a>
      </li>`,
    )
    .join('');
  const overflowNote =
    overflow > 0 ? `<p style="color:#6b7280">외 ${overflow}개는 다음 발송에 이어집니다.</p>` : '';

  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2>겟꿀 다이제스트</h2>
      <ul style="list-style:none;padding:0">${htmlItems}</ul>
      ${overflowNote}
      <hr/>
      <a href="${escapeHtml(appBaseUrl)}" style="font-size:13px;color:#6b7280">겟꿀에서 보기(영어 전환 등)</a>
    </div>`;

  return { subject, html, text };
}
