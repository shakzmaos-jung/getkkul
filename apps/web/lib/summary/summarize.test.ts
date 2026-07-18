import { describe, it, expect, vi } from 'vitest';
import {
  summarizeAllModes,
  allModesSystemPrompt,
  resolveProvidedCeiling,
  PROMPT_VERSION,
} from './summarize';
import { pointsToText, informationLength, type StructuredSummaries } from './format';
import type OpenAI from 'openai';

function mockClient(contents: (string | null)[]) {
  const create = vi.fn<
    (args: Record<string, unknown>) => Promise<{
      choices: { message: { content: string | null } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    }>
  >(async () => {
    const content = contents.length > 1 ? contents.shift()! : contents[0];
    return { choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 50 } };
  });
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
}

const validAll = JSON.stringify({
  depthCeiling: 'long',
  short: { headline: 's', points: ['핵심 사실 하나.'] },
  normal: { headline: 'n', points: ['핵심 사실 하나.', '핵심 사실 둘과 맥락.'] },
  long: {
    headline: 'l',
    facts: ['매출이 20% 늘었다는 사실.', '신규 고객이 증가했다는 사실.', '구체 수치 168달러.'],
    insights: ['성장 여력이 있다는 시사점.'],
  },
});

describe('allModesSystemPrompt (프롬프트 계약)', () => {
  it('상세도 3단계(간단히/자세히/최대한)·불릿·과교정을 지시하고 하이라이트는 없다', () => {
    const p = allModesSystemPrompt('ko');
    expect(p).toContain('간단히');
    expect(p).toContain('자세히');
    expect(p).toContain('최대한');
    expect(p).toContain('points');
    expect(p).toContain('facts');
    expect(p).toContain('insights');
    expect(p).toContain('단조성');
    expect(p).toMatch(/과교정 금지|지어내지 마라/);
    expect(p).toContain('S&P500');
    expect(p).toMatch(/띄어쓰기|조사|오탈자/); // 일반 STT 오타 교정 확장
    expect(p).toContain('용어 추출'); // 어려운 용어 목록 추출 지시
    expect(p).not.toMatch(/하이라이트|밑줄|key=true/); // 하이라이트 지시 제거
  });
  it('depthCeiling 을 길이·말투가 아니라 내용(정보 밀도) 기준으로 판정하도록 지시한다', () => {
    const p = allModesSystemPrompt('ko');
    expect(p).toContain('depthCeiling');
    expect(p).toContain('실질 정보'); // 정보 밀도 기준
    expect(p).toMatch(/대화체.*낮추지|낮추지 마라/); // 대화체라고 낮추지 말 것
    expect(p).toMatch(/길어도 알맹이가 없으면 short|길든 짧든/); // 길이로 판정하지 않음
    expect(p).not.toMatch(/짧은 영상 → "short"/); // 길이=short 오도 앵커 제거
  });
  it('표기형 정규화(한/영/하이브리드)와 교정 보고(corrections)를 지시한다', () => {
    const p = allModesSystemPrompt('ko');
    expect(p).toContain('표기형'); // 표기형 정규화 규칙
    expect(p).toContain('corrections'); // 교정 보고 배열
    expect(p).toMatch(/하이브리드|Kimi K3/); // 하이브리드 표기 예시
    expect(p).toContain('ChatGPT'); // 음차→라틴 정규화 예시
  });
  it('채널 도메인 힌트 주입', () => {
    const p = allModesSystemPrompt('ko', { channelTitle: '삼프로TV', videoTitle: '금리', terms: ['연준'] });
    expect(p).toContain('삼프로TV');
    expect(p).toContain('금리');
    expect(p).toContain('연준');
  });
});

describe('summarizeAllModes (단일 호출 3종 불릿)', () => {
  it('1콜·전사 1회·reasoning low·points 배열 반환', async () => {
    const { create, client } = mockClient([validAll]);
    const { structured, ceiling, usage } = await summarizeAllModes('전사텍스트XYZ', 'ko', { client });
    expect(create).toHaveBeenCalledTimes(1);
    expect(usage.calls).toBe(1);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5-nano');
    expect(args.reasoning_effort).toBe('low');
    expect(args.temperature).toBeUndefined();
    expect(JSON.stringify(args.messages).split('전사텍스트XYZ').length - 1).toBe(1);
    expect(ceiling).toBe('long');
    expect(structured.short.points).toEqual(['핵심 사실 하나.']);
    expect(structured.normal.points.length).toBe(2);
    expect(structured.long.facts.length).toBe(3);
    expect(structured.long.insights.length).toBe(1);
  });

  it('terms 배열을 함께 반환한다(용어 추출·trim·빈값 제외)', async () => {
    const withTerms = JSON.stringify({
      depthCeiling: 'long',
      short: { headline: 's', points: ['핵심.'] },
      normal: { headline: 'n', points: ['핵심.', '둘.'] },
      long: { headline: 'l', facts: ['가.', '나.', '다.'], insights: ['시사점.'] },
      terms: ['NPU', ' 파운드리 ', '  '],
    });
    const { client } = mockClient([withTerms]);
    const { terms } = await summarizeAllModes('전사', 'ko', { client });
    expect(terms).toEqual(['NPU', '파운드리']);
  });

  it('corrections 배열을 파싱해 반환한다(빈 표기·잘못된 form 제거)', async () => {
    const withCorr = JSON.stringify({
      depthCeiling: 'long',
      short: { headline: 's', points: ['핵심.'] },
      normal: { headline: 'n', points: ['핵심.', '둘.'] },
      long: { headline: 'l', facts: ['가.', '나.', '다.'], insights: [] },
      terms: [],
      corrections: [
        { original: '챗지피티', corrected: 'ChatGPT', form: 'en', reason: '음차→라틴' },
        { original: ' 키미 케이쓰리 ', corrected: '키미 K3(Kimi K3)', form: 'hybrid', reason: '하이브리드' },
        { original: '', corrected: 'x', form: 'en', reason: '빈 원문 제거' },
        { original: 'y', corrected: 'z', form: 'bogus', reason: '잘못된 form 제거' },
      ],
    });
    const { client } = mockClient([withCorr]);
    const { corrections } = await summarizeAllModes('전사', 'ko', { client });
    expect(corrections).toEqual([
      { original: '챗지피티', corrected: 'ChatGPT', form: 'en', reason: '음차→라틴' },
      { original: '키미 케이쓰리', corrected: '키미 K3(Kimi K3)', form: 'hybrid', reason: '하이브리드' },
    ]);
  });

  it('corrections 필드가 없어도 빈 배열로 안전 반환한다', async () => {
    const { client } = mockClient([validAll]);
    const { corrections } = await summarizeAllModes('전사', 'ko', { client });
    expect(corrections).toEqual([]);
  });

  it('depthCeiling=short 이면 상위 모드 미제공', async () => {
    const shallow = JSON.stringify({
      depthCeiling: 'short',
      short: { headline: 't', points: ['짧은 잡담 요약.'] },
      normal: { headline: 't', points: ['.'] },
      long: { headline: 't', facts: ['.'], insights: [] },
    });
    const { client } = mockClient([shallow]);
    const { ceiling } = await summarizeAllModes('짧은 전사', 'ko', { client });
    expect(ceiling).toBe('short');
  });

  it('구조 재시도 시 2번째 호출엔 전사 미포함', async () => {
    const bad = JSON.stringify({
      depthCeiling: 'long',
      short: { headline: 't', points: ['핵심.'] },
      normal: { headline: 't', points: ['핵심 둘.'] },
      long: { headline: 't', facts: [], insights: [] }, // facts 비어 구조 미달
    });
    const { create, client } = mockClient([bad, validAll]);
    await summarizeAllModes('전사텍스트XYZ', 'ko', { client });
    expect(create).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(create.mock.calls[1][0].messages).includes('전사텍스트XYZ')).toBe(false);
  });
});

describe('resolveProvidedCeiling — 단조성 방어 (S1)', () => {
  const base: StructuredSummaries = {
    depthCeiling: 'long',
    short: { headline: 't', points: ['가나다.'] },
    normal: { headline: 't', points: ['가나다라마바사아자차카타파.'] },
    long: { headline: 't', facts: ['가나.'], insights: [] },
  };
  it('long 이 normal 보다 짧으면 long 을 제공에서 낮춘다', () => {
    expect(informationLength(pointsToText([...base.long.facts, ...base.long.insights]))).toBeLessThan(
      informationLength(pointsToText(base.normal.points)),
    );
    expect(resolveProvidedCeiling(base)).toBe('normal');
  });
  it('정상 단조면 ceiling 유지', () => {
    const ok: StructuredSummaries = {
      ...base,
      long: { headline: 't', facts: ['가나다라마바사아자차카타파하가나다라마바.'], insights: ['가나다라마.'] },
    };
    expect(resolveProvidedCeiling(ok)).toBe('long');
  });
  it('PROMPT_VERSION', () => {
    expect(PROMPT_VERSION).toMatch(/^sq-/);
  });
});
