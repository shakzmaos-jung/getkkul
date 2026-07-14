import { describe, it, expect } from 'vitest';
import {
  LENGTH_MODES,
  MODE_LABELS,
  isLengthMode,
  providedModes,
  isProvided,
  informationLength,
  pointsToText,
  longBodyToText,
  checkMonotonicity,
  type LongBody,
} from './format';

describe('isLengthMode', () => {
  it('유효한 모드만 통과', () => {
    expect(isLengthMode('short')).toBe(true);
    expect(isLengthMode('long')).toBe(true);
    expect(isLengthMode('요점')).toBe(false);
    expect(isLengthMode(undefined)).toBe(false);
  });
});

describe('MODE_LABELS (설정 요약 길이 의역)', () => {
  it('간단히/자세히/최대한', () => {
    expect(MODE_LABELS).toEqual({ short: '간단히', normal: '자세히', long: '최대한' });
  });
});

describe('providedModes / isProvided (적응형 깊이)', () => {
  it('ceiling 이하 모드만 제공', () => {
    expect(providedModes('short')).toEqual(['short']);
    expect(providedModes('normal')).toEqual(['short', 'normal']);
    expect(isProvided('long', 'short')).toBe(false);
    expect(isProvided('short', 'short')).toBe(true);
  });
});

describe('불릿 결합', () => {
  it('pointsToText: 줄바꿈 결합 + 빈 항목 제거', () => {
    expect(pointsToText(['가', ' ', '나'])).toBe('가\n나');
    expect(pointsToText([])).toBe('');
  });
  it('longBodyToText: facts→insights 줄바꿈 결합', () => {
    const long: LongBody = { facts: ['사실1', '사실2'], insights: ['인사이트'] };
    expect(longBodyToText(long)).toBe('사실1\n사실2\n인사이트');
  });
});

describe('checkMonotonicity — 단조성 (S1: 역전 0)', () => {
  it('요점 ≤ 핵심 ≤ 심층 이면 valid', () => {
    const r = checkMonotonicity({ short: '가나', normal: '가나다라', long: '가나다라마바' });
    expect(r.valid).toBe(true);
  });
  it('역전(long < normal)이면 invalid', () => {
    expect(checkMonotonicity({ short: '가', normal: '가나다라', long: '가나' }).valid).toBe(false);
  });
  it('누락 모드는 판정 제외', () => {
    expect(checkMonotonicity({ short: '가', normal: '가나다' }).valid).toBe(true);
    expect(checkMonotonicity({ short: '가나다' }).valid).toBe(true);
  });
  it('정보량은 공백 제외 글자수', () => {
    expect(informationLength('가 나\n다')).toBe(3);
  });
});

describe('LENGTH_MODES 상수', () => {
  it('short/normal/long', () => {
    expect(LENGTH_MODES).toEqual(['short', 'normal', 'long']);
  });
});
