import { describe, it, expect } from 'vitest';
import { SEND_SLOTS_KST, SLOT_CODES, slotToCode, formatKst, nextSendSlot } from './time';

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

describe('nextSendSlot (다음 발송 시각, KST)', () => {
  // KST = UTC + 9. 슬롯 이후(strictly after) 가장 이른 슬롯을 반환한다.
  const cases: [string, string, string][] = [
    ['KST 00:00 → 07:30', '2026-07-04T15:00:00Z', '07:30'],
    ['KST 06:00 → 07:30', '2026-07-04T21:00:00Z', '07:30'],
    ['KST 07:29 → 07:30', '2026-07-04T22:29:00Z', '07:30'],
    ['KST 07:30 정각 → 11:30', '2026-07-04T22:30:00Z', '11:30'],
    ['KST 09:00 → 11:30', '2026-07-05T00:00:00Z', '11:30'],
    ['KST 11:30 정각 → 17:30', '2026-07-05T02:30:00Z', '17:30'],
    ['KST 12:00 → 17:30', '2026-07-05T03:00:00Z', '17:30'],
    ['KST 17:30 정각 → 07:30(익일)', '2026-07-05T08:30:00Z', '07:30'],
    ['KST 20:00 → 07:30(익일)', '2026-07-05T11:00:00Z', '07:30'],
  ];

  for (const [label, iso, expected] of cases) {
    it(label, () => {
      expect(nextSendSlot(new Date(iso))).toBe(expected);
    });
  }

  it('반환값은 정의된 슬롯 중 하나다', () => {
    expect(SEND_SLOTS_KST).toContain(nextSendSlot(new Date('2026-07-05T00:00:00Z')));
  });
});
