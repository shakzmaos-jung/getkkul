import { describe, it, expect } from 'vitest';
import { ceil10, hms, computeReading } from './reading';

describe('ceil10 / hms', () => {
  it('ceil10: 10초 단위 올림, 최소 10초', () => {
    expect(ceil10(0)).toBe(10);
    expect(ceil10(73)).toBe(80);
    expect(ceil10(80)).toBe(80);
  });
  it('hms: 0 단위 생략', () => {
    expect(hms(0)).toBe('0초');
    expect(hms(90)).toBe('1분 30초');
    expect(hms(3661)).toBe('1시간 1분 1초');
  });
});

describe('computeReading (읽는 시간·압축률)', () => {
  it('본문 글자수 → 읽는 시간(10초 올림), 영상 대비 압축률', () => {
    // 250자 → 30초 읽기(250/500*60). 600초 영상 → 압축률 95.0%
    const core = 'ㄱ'.repeat(250);
    const r = computeReading(core, [], 600);
    expect(r.hasBody).toBe(true);
    expect(r.readText).toBe('30초');
    expect(r.compressionPct).toBeCloseTo(95.0, 1);
  });
  it('공백은 글자수에서 제외', () => {
    const r = computeReading('가 나 다', [], null);
    expect(r.hasBody).toBe(true);
    expect(r.compressionPct).toBeNull(); // 길이 미상 → null
  });
  it('본문 없으면 hasBody=false, 압축률 null', () => {
    const r = computeReading('', [], 600);
    expect(r.hasBody).toBe(false);
    expect(r.compressionPct).toBeNull();
  });
  it('압축률 상한 99.9로 클램프', () => {
    const r = computeReading('가', [], 100000);
    expect(r.compressionPct).toBeLessThanOrEqual(99.9);
  });
});
