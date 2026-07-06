import { describe, it, expect } from 'vitest';
import { parseIso8601Duration, formatDuration } from './duration';

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
