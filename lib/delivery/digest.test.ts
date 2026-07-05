import { describe, it, expect } from 'vitest';
import {
  selectDigestVideos,
  slotForKstHour,
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

describe('slotForKstHour (발송 슬롯 판정)', () => {
  it('KST 시각을 3슬롯으로 매핑', () => {
    expect(slotForKstHour(7)).toBe('0730');
    expect(slotForKstHour(11)).toBe('1130');
    expect(slotForKstHour(13)).toBe('1130');
    expect(slotForKstHour(17)).toBe('1730');
    expect(slotForKstHour(23)).toBe('1730');
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
