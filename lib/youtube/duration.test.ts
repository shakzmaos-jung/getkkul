import { describe, it, expect } from 'vitest';
import { parseIso8601Duration, formatDuration, passesDurationFilters } from './duration';

describe('parseIso8601Duration', () => {
  it('분·초를 초로 변환', () => {
    expect(parseIso8601Duration('PT12M34S')).toBe(754);
  });
  it('시·분·초를 초로 변환', () => {
    expect(parseIso8601Duration('PT1H2M3S')).toBe(3723);
  });
  it('초만 있는 경우', () => {
    expect(parseIso8601Duration('PT45S')).toBe(45);
  });
  it('시만 있는 경우', () => {
    expect(parseIso8601Duration('PT1H')).toBe(3600);
  });
  it('라이브/길이없음(P0D)·0초·빈값·null 은 null', () => {
    expect(parseIso8601Duration('P0D')).toBeNull();
    expect(parseIso8601Duration('PT0S')).toBeNull();
    expect(parseIso8601Duration('')).toBeNull();
    expect(parseIso8601Duration(null)).toBeNull();
    expect(parseIso8601Duration('garbage')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('1시간 미만은 m:ss', () => {
    expect(formatDuration(754)).toBe('12:34');
    expect(formatDuration(45)).toBe('0:45');
  });
  it('1시간 이상은 h:mm:ss', () => {
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(3600)).toBe('1:00:00');
  });
  it('null·0·음수·비유한값은 빈 문자열', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(-5)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
  });
});

describe('passesDurationFilters', () => {
  it('2분 미만은 항상 제외(설정 무관, 1분 넘는 숏츠 포함)', () => {
    expect(passesDurationFilters(119, false)).toBe(false);
    expect(passesDurationFilters(119, true)).toBe(false);
    expect(passesDurationFilters(90, true)).toBe(false); // 1분 넘는 숏츠도 제외
    expect(passesDurationFilters(120, true)).toBe(true); // 정확히 2분은 통과
  });
  it('2시간 이상은 excludeOver2h 일 때만 제외', () => {
    expect(passesDurationFilters(7200, true)).toBe(false); // 2시간
    expect(passesDurationFilters(7200, false)).toBe(true); // 옵션 끄면 통과
    expect(passesDurationFilters(7199, true)).toBe(true); // 2시간 미만 통과
  });
  it('길이 미상(null)은 통과', () => {
    expect(passesDurationFilters(null, true)).toBe(true);
  });
});
