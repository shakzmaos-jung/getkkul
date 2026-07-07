import { describe, it, expect } from 'vitest';
import {
  slotPushEnabled,
  pushTargetsForSlot,
  shouldSendEmptyAware,
  renderPushMessage,
  type PushUserRow,
} from './push-routing';
import type { DigestSelection } from '@/lib/delivery/digest';

const S = (a: boolean, b: boolean, c: boolean) => ({
  push_slot_0730: a,
  push_slot_1130: b,
  push_slot_1730: c,
});

describe('slotPushEnabled', () => {
  it('슬롯별 토글', () => {
    expect(slotPushEnabled(S(true, false, false), '0730')).toBe(true);
    expect(slotPushEnabled(S(true, false, false), '1130')).toBe(false);
    expect(slotPushEnabled(S(false, false, true), '1730')).toBe(true);
  });
});

describe('pushTargetsForSlot (슬롯별 발송 대상 필터링)', () => {
  const rows: PushUserRow[] = [
    { userId: 'a', settings: S(true, false, false), hasSubscription: true }, // 0730 on + 구독 → 대상
    { userId: 'b', settings: S(true, false, false), hasSubscription: false }, // 구독 없음 → 제외
    { userId: 'c', settings: S(false, true, false), hasSubscription: true }, // 0730 off → 제외
    { userId: 'd', settings: S(true, true, true), hasSubscription: true }, // 대상
  ];
  it('0730 슬롯: 토글 on + 구독 보유만', () => {
    expect(pushTargetsForSlot(rows, '0730')).toEqual(['a', 'd']);
  });
  it('1130 슬롯', () => {
    expect(pushTargetsForSlot(rows, '1130')).toEqual(['c', 'd']);
  });
});

describe('shouldSendEmptyAware (빈 슬롯 생략 분기)', () => {
  it('새 항목 있으면 skip 여부 무관하게 발송', () => {
    expect(shouldSendEmptyAware(true, true)).toBe(true);
    expect(shouldSendEmptyAware(true, false)).toBe(true);
  });
  it('빈 슬롯: skipEmpty=true 면 생략, false 면 발송', () => {
    expect(shouldSendEmptyAware(false, true)).toBe(false);
    expect(shouldSendEmptyAware(false, false)).toBe(true);
  });
});

describe('renderPushMessage', () => {
  const sel = (n: number): DigestSelection =>
    ({
      items: Array.from({ length: n }, (_, i) => ({
        videoId: `v${i}`,
        title: `t${i}`,
        url: `u${i}`,
        headline: `헤드${i}`,
        coreText: '',
      })),
    }) as DigestSelection;
  it('빈 선택', () => {
    expect(renderPushMessage(sel(0), { appBaseUrl: 'https://x' })).toMatchObject({
      title: '겟꿀',
      url: 'https://x/feed',
    });
  });
  it('1개/다수', () => {
    expect(renderPushMessage(sel(1)).body).toBe('헤드0');
    expect(renderPushMessage(sel(3)).body).toBe('헤드0 외 2개');
    expect(renderPushMessage(sel(3)).title).toBe('겟꿀 · 새 다이제스트 3개');
  });
});
