import { describe, it, expect } from 'vitest';
import {
  selectDigestVideos,
  resolveDeliverySlot,
  renderDigest,
  MAX_DIGEST_ITEMS,
  type DigestVideo,
} from './digest';

function vids(n: number): DigestVideo[] {
  return Array.from({ length: n }, (_, i) => ({
    videoId: `v${i}`,
    title: `제목 ${i}`,
    url: `https://youtube.com/watch?v=v${i}`,
    headline: `헤드라인 ${i}`,
    coreText: `핵심 ${i}`,
  }));
}

describe('selectDigestVideos (AC-E2.4 최대 30 + 이월)', () => {
  it('30개 이하는 전부, 이월 0', () => {
    const r = selectDigestVideos(vids(5));
    expect(r.items).toHaveLength(5);
    expect(r.overflow).toBe(0);
  });

  it('30 초과분은 이월', () => {
    const r = selectDigestVideos(vids(35));
    expect(r.items).toHaveLength(MAX_DIGEST_ITEMS);
    expect(r.overflow).toBe(5);
  });
});

describe('resolveDeliverySlot (슬롯 판정 + 시각 가드)', () => {
  // KST = UTC+9. Date 는 UTC 로 지정.
  it('슬롯 정시 근처(±허용)는 해당 슬롯 + withinWindow=true', () => {
    // 07:31 KST (UTC 22:31) → 0730, offset 1
    const a = resolveDeliverySlot(new Date('2026-07-11T22:31:00Z'));
    expect(a.slot).toBe('0730');
    expect(a.offsetMin).toBe(1);
    expect(a.withinWindow).toBe(true);
    // 11:32 KST (UTC 02:32) → 1130
    const b = resolveDeliverySlot(new Date('2026-07-11T02:32:00Z'));
    expect(b.slot).toBe('1130');
    expect(b.withinWindow).toBe(true);
    // 17:30 KST (UTC 08:30) → 1730, offset 0
    const c = resolveDeliverySlot(new Date('2026-07-11T08:30:00Z'));
    expect(c.slot).toBe('1730');
    expect(c.offsetMin).toBe(0);
    expect(c.withinWindow).toBe(true);
    // 21:31 KST (UTC 12:31) → 2130, offset 1
    const d = resolveDeliverySlot(new Date('2026-07-11T12:31:00Z'));
    expect(d.slot).toBe('2130');
    expect(d.offsetMin).toBe(1);
    expect(d.withinWindow).toBe(true);
  });

  it('허용창 경계: 정확히 10분은 통과, 11분은 스킵', () => {
    // 07:40 KST → offset 10 (경계 포함)
    expect(resolveDeliverySlot(new Date('2026-07-11T22:40:00Z')).withinWindow).toBe(true);
    // 07:41 KST → offset 11 (창 밖)
    expect(resolveDeliverySlot(new Date('2026-07-11T22:41:00Z')).withinWindow).toBe(false);
  });

  it('off-slot 실행은 최근접 슬롯 + withinWindow=false (관측된 오발송 시각 차단)', () => {
    // 08:34 KST (UTC 23:34) — 실제 관측된 지연 발송 → 0730 에서 64분, 차단
    const late = resolveDeliverySlot(new Date('2026-07-11T23:34:00Z'));
    expect(late.slot).toBe('0730');
    expect(late.offsetMin).toBe(64);
    expect(late.withinWindow).toBe(false);
    // 14:00 KST (UTC 05:00) — 수동 실행 → 최근접 1130, 차단
    const noon = resolveDeliverySlot(new Date('2026-07-11T05:00:00Z'));
    expect(noon.slot).toBe('1130');
    expect(noon.withinWindow).toBe(false);
  });
});

describe('renderDigest (AC-E2.3 / F1.2)', () => {
  it('빈 목록은 "새 소식 없음"', () => {
    const m = renderDigest({ items: [], overflow: 0 });
    expect(m.subject).toContain('새 소식 없음');
    expect(m.text).toContain('새로 준비된 영상이 없습니다');
  });

  it('영상이 있으면 헤드라인·원본 링크 포함(F1.2)', () => {
    const m = renderDigest(selectDigestVideos(vids(2)));
    expect(m.subject).toContain('2개');
    expect(m.html).toContain('헤드라인 0');
    expect(m.html).toContain('https://youtube.com/watch?v=v0'); // 원본 링크
    expect(m.text).toContain('원본:');
  });

  it('이월이 있으면 안내 문구', () => {
    const m = renderDigest(selectDigestVideos(vids(32)));
    expect(m.text).toContain('외 2개');
    expect(m.html).toContain('외 2개');
  });

  it('HTML 특수문자를 이스케이프', () => {
    const item: DigestVideo = {
      videoId: 'x',
      title: 't',
      url: 'https://y',
      headline: '<script>&"위험"',
      coreText: 'c',
    };
    const m = renderDigest({ items: [item], overflow: 0 });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
  });
});
