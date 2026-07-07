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

/** 푸시 메시지(title/body/url) 구성. 항목 있으면 대표 헤드라인 + 개수. */
export function renderPushMessage(
  selection: DigestSelection,
  opts: { appBaseUrl?: string } = {},
): { title: string; body: string; url: string } {
  const url = `${opts.appBaseUrl ?? ''}/feed`;
  const n = selection.items.length;
  if (n === 0) return { title: '겟꿀', body: '아직 새 소식이 없어요.', url };
  const first = selection.items[0];
  const title = `겟꿀 · 새 다이제스트 ${n}개`;
  const body = n === 1 ? first.headline : `${first.headline} 외 ${n - 1}개`;
  return { title, body, url };
}
