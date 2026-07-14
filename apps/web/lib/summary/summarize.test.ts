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
    expect(p).not.toMatch(/하이라이트|밑줄|key=true/); // 하이라이트 지시 제거
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
