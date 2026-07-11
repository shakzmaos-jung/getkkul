import { describe, it, expect } from 'vitest';
import {
  LENGTH_MODES,
  isLengthMode,
  providedModes,
  isProvided,
  countSentences,
  informationLength,
  longBodyToText,
  hasHighlight,
  checkMonotonicity,
  type LongBody,
} from './format';

describe('isLengthMode', () => {
  it('유효한 모드만 통과', () => {
    expect(isLengthMode('short')).toBe(true);
    expect(isLengthMode('normal')).toBe(true);
    expect(isLengthMode('long')).toBe(true);
    expect(isLengthMode('짧게')).toBe(false);
    expect(isLengthMode('')).toBe(false);
    expect(isLengthMode(undefined)).toBe(false);
  });
});

describe('providedModes / isProvided (적응형 깊이 — REQ-C1)', () => {
  it('ceiling 이하 모드만 제공된다', () => {
    expect(providedModes('short')).toEqual(['short']);
    expect(providedModes('normal')).toEqual(['short', 'normal']);
    expect(providedModes('long')).toEqual(['short', 'normal', 'long']);
  });
  it('상위 모드는 제공 안 함(AC-C1.3)', () => {
    expect(isProvided('long', 'short')).toBe(false);
    expect(isProvided('normal', 'short')).toBe(false);
    expect(isProvided('short', 'short')).toBe(true);
    expect(isProvided('long', 'long')).toBe(true);
  });
});

describe('countSentences / informationLength', () => {
  it('문장 수를 센다', () => {
    expect(countSentences('안녕하세요. 반갑습니다.')).toBe(2);
    expect(countSentences('Hello world! How are you?')).toBe(2);
    expect(countSentences('   ')).toBe(0);
  });
  it('정보량은 공백 제외 글자수', () => {
    expect(informationLength('가 나 다')).toBe(3);
    expect(informationLength('  ab c ')).toBe(3);
    expect(informationLength('')).toBe(0);
  });
});

describe('long 2단락 (REQ-A1.3) + 하이라이트 (REQ-E1)', () => {
  const long: LongBody = {
    facts: [
      { text: '매출이 20% 늘었다.', key: true },
      { text: '신규 고객이 증가했다.', key: false },
    ],
    insights: [{ text: '성장 여력이 있다.', key: false }],
  };
  it('facts → insights 순으로 평문 결합', () => {
    expect(longBodyToText(long)).toBe('매출이 20% 늘었다. 신규 고객이 증가했다. 성장 여력이 있다.');
  });
  it('핵심 문장 하이라이트가 최소 1개 있으면 true', () => {
    expect(hasHighlight(long)).toBe(true);
    expect(hasHighlight({ facts: [{ text: 'a', key: false }], insights: [] })).toBe(false);
  });
});

describe('checkMonotonicity — 단조성 (S1: 역전 0건, REQ-B1)', () => {
  it('short ≤ normal ≤ long 이면 valid', () => {
    const r = checkMonotonicity({ short: '가나', normal: '가나다라', long: '가나다라마바' });
    expect(r.valid).toBe(true);
    expect(r.lengths).toEqual({ short: 2, normal: 4, long: 6 });
  });
  it('길이 역전(long < normal)이면 invalid', () => {
    const r = checkMonotonicity({ short: '가', normal: '가나다라', long: '가나' });
    expect(r.valid).toBe(false);
  });
  it('제공 안 함(누락) 모드는 판정에서 제외', () => {
    // long 미제공(ceiling=normal) → short ≤ normal 만 본다
    expect(checkMonotonicity({ short: '가', normal: '가나다' }).valid).toBe(true);
    // short 만 제공(ceiling=short) → 항상 valid
    expect(checkMonotonicity({ short: '가나다' }).valid).toBe(true);
  });
  it('동일 길이는 역전이 아니다(≤)', () => {
    expect(checkMonotonicity({ short: '가나', normal: '가나', long: '가나' }).valid).toBe(true);
  });
});

describe('LENGTH_MODES 상수', () => {
  it('short/normal/long 3종', () => {
    expect(LENGTH_MODES).toEqual(['short', 'normal', 'long']);
  });
});
