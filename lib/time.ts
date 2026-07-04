/**
 * 타임존 유틸 (SSR H1)
 * - 모든 타임스탬프는 UTC(ISO 8601, `Z`)로 저장한다.
 * - 스케줄·표시는 KST(Asia/Seoul)로 변환한다.
 * 서버는 임의의 표시용 로컬 변환을 하지 않으므로, 표시 변환은 이 유틸을 경유한다.
 */

export const KST_TIME_ZONE = 'Asia/Seoul';

/** 하루 3회 발송 슬롯 (KST 고정, PRD §9 / SSR AC-E2.1). */
export const SEND_SLOTS_KST = ['07:30', '11:30', '17:30'] as const;
export type SendSlot = (typeof SEND_SLOTS_KST)[number];

/** deliveries.slot enum 값 (SSR G). */
export const SLOT_CODES = ['0730', '1130', '1730'] as const;
export type SlotCode = (typeof SLOT_CODES)[number];

/** 'HH:MM' KST 슬롯을 DB enum 코드로 변환한다. */
export function slotToCode(slot: SendSlot): SlotCode {
  return slot.replace(':', '') as SlotCode;
}

/**
 * UTC ISO 문자열을 KST 표시 문자열로 변환한다.
 * @example formatKst('2026-07-05T00:30:00Z') // "2026. 7. 5. 오전 9:30"
 */
export function formatKst(isoUtc: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: KST_TIME_ZONE,
  }).format(new Date(isoUtc));
}
