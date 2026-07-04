import { describe, it, expect } from 'vitest';
import { SEND_SLOTS_KST, SLOT_CODES, slotToCode, formatKst } from './time';

describe('time util (H1 타임존)', () => {
  it('발송 슬롯은 KST 07:30 / 11:30 / 17:30 3개다', () => {
    expect(SEND_SLOTS_KST).toEqual(['07:30', '11:30', '17:30']);
  });

  it('슬롯을 DB enum 코드로 변환한다', () => {
    expect(slotToCode('07:30')).toBe('0730');
    expect(slotToCode('11:30')).toBe('1130');
    expect(slotToCode('17:30')).toBe('1730');
    // 변환 결과가 정의된 코드 집합에 속한다
    for (const slot of SEND_SLOTS_KST) {
      expect(SLOT_CODES).toContain(slotToCode(slot));
    }
  });

  it('UTC ISO를 KST(+9h)로 변환해 표시한다', () => {
    // 00:30 UTC -> 09:30 KST
    const formatted = formatKst('2026-07-05T00:30:00Z');
    expect(formatted).toContain('9:30');
    expect(formatted).toContain('2026');
  });

  it('자정 경계에서 날짜가 KST 기준으로 넘어간다', () => {
    // 2026-07-04T20:00Z -> 2026-07-05 05:00 KST (다음 날)
    const formatted = formatKst('2026-07-04T20:00:00Z');
    expect(formatted).toContain('7. 5.');
  });
});
