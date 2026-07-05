import { describe, it, expect } from 'vitest';
import {
  LENGTH_SPECS,
  countSentences,
  validateSummaryFormat,
  isLengthMode,
  type Summary,
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

function makeSummary(sentences: number, bullets: number): Summary {
  return {
    headline: '헤드라인',
    coreText: Array.from({ length: sentences }, (_, i) => `문장${i + 1}입니다.`).join(' '),
    bullets: Array.from({ length: bullets }, (_, i) => `불릿 ${i + 1}`),
  };
}

describe('countSentences', () => {
  it('한국어/영어 문장부호로 문장 수를 센다', () => {
    expect(countSentences('안녕하세요. 반갑습니다.')).toBe(2);
    expect(countSentences('Hello world! How are you?')).toBe(2);
    expect(countSentences('문장 하나만')).toBe(1);
    expect(countSentences('   ')).toBe(0);
  });
});

describe('validateSummaryFormat (AC-D2.2)', () => {
  it('각 모드 규격 내 요약은 valid', () => {
    expect(validateSummaryFormat(makeSummary(2, 3), 'short').valid).toBe(true);
    expect(validateSummaryFormat(makeSummary(5, 8), 'normal').valid).toBe(true);
    expect(validateSummaryFormat(makeSummary(10, 15), 'long').valid).toBe(true);
  });

  it('불릿 개수가 범위를 벗어나면 invalid', () => {
    // short 불릿 최대 5 초과
    const r = validateSummaryFormat(makeSummary(2, 6), 'short');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('불릿'))).toBe(true);
  });

  it('핵심 문장 수가 범위를 벗어나면 invalid', () => {
    // short 문장 최대 3 초과
    const r = validateSummaryFormat(makeSummary(5, 3), 'short');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('문장'))).toBe(true);
  });

  it('long 은 불릿 10개 미만이면 invalid', () => {
    expect(validateSummaryFormat(makeSummary(5, 5), 'long').valid).toBe(false);
  });

  it('헤드라인이 비면 invalid', () => {
    const s = makeSummary(2, 3);
    s.headline = '  ';
    expect(validateSummaryFormat(s, 'short').valid).toBe(false);
  });

  it('규격 상수는 SSR 정의와 일치', () => {
    expect(LENGTH_SPECS.short).toEqual({
      coreSentencesMin: 1,
      coreSentencesMax: 3,
      bulletsMin: 2,
      bulletsMax: 5,
    });
    expect(LENGTH_SPECS.long.bulletsMax).toBe(20);
  });
});
