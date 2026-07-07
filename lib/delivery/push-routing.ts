import type { SlotCode } from '@/lib/time';
import type { DigestSelection } from '@/lib/delivery/digest';

/** 사용자별 슬롯 푸시 on/off 설정. */
export interface PushSlotSettings {
  push_slot_0730: boolean;
  push_slot_1130: boolean;
  push_slot_1730: boolean;
}

/** 해당 슬롯의 푸시 토글이 켜져 있는가. */
export function slotPushEnabled(s: PushSlotSettings, slot: SlotCode): boolean {
  if (slot === '0730') return s.push_slot_0730;
  if (slot === '1130') return s.push_slot_1130;
  return s.push_slot_1730;
}

/** 슬롯 푸시 발송 대상 필터링(AC-E1.1): 슬롯 토글 on + 유효 구독 보유 사용자만. */
export interface PushUserRow {
  userId: string;
  settings: PushSlotSettings;
  hasSubscription: boolean;
}
export function pushTargetsForSlot(rows: PushUserRow[], slot: SlotCode): string[] {
  return rows
    .filter((r) => r.hasSubscription && slotPushEnabled(r.settings, slot))
    .map((r) => r.userId);
}

/** 빈 슬롯 생략 분기(AC-E1.4): 새 항목 있으면 항상 발송, 없으면 skipEmpty 의 반대. */
export function shouldSendEmptyAware(hasItems: boolean, skipEmpty: boolean): boolean {
  return hasItems || !skipEmpty;
}

// 한국어 평균 독서 속도(자/분). "흡수하는데 걸리는 시간" 산정 기준.
const CHARS_PER_MIN = 500;

/** 요약 본문 글자수 → 읽는(흡수) 시간(초). */
function readSeconds(text: string): number {
  const c = (text ?? '').replace(/\s+/g, '').length;
  return c > 0 ? (c / CHARS_PER_MIN) * 60 : 0;
}

/** 초 → "N시간 N분 N초"(0 단위 생략). */
function hmsPush(sec: number): string {
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}시간`);
  if (m > 0) parts.push(`${m}분`);
  if (s > 0) parts.push(`${s}초`);
  return parts.length > 0 ? parts.join(' ') : '0초';
}

/**
 * 푸시 메시지(title/body/url) 구성. 항목이 있으면 "압축 완료 건수 + 원본 영상 총 길이 +
 * 흡수(읽는)에 걸리는 시간"으로 시간 절약을 어필한다.
 */
export function renderPushMessage(
  selection: DigestSelection,
  opts: { appBaseUrl?: string } = {},
): { title: string; body: string; url: string } {
  const url = `${opts.appBaseUrl ?? ''}/feed`;
  const n = selection.items.length;
  if (n === 0) return { title: '겟꿀', body: '아직 새 소식이 없어요.', url };

  const totalVideoSec = selection.items.reduce((a, v) => a + (v.durationSeconds ?? 0), 0);
  const totalReadSec = selection.items.reduce((a, v) => a + readSeconds(v.coreText), 0);
  return {
    title: `유튜브 콘텐츠 ${n}건 압축 완료`,
    body: `원본 영상 ${hmsPush(totalVideoSec)}, 흡수하는데 걸리는 시간 ${hmsPush(totalReadSec)}`,
    url,
  };
}
