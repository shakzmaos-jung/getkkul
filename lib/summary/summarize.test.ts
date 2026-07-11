import { describe, it, expect, vi } from 'vitest';
import {
  summarizeAllModes,
  allModesSystemPrompt,
  resolveProvidedCeiling,
  PROMPT_VERSION,
} from './summarize';
import { longBodyToText, informationLength, type StructuredSummaries } from './format';
import type OpenAI from 'openai';

/** 지정한 content 들을 순서대로 반환하는 mock OpenAI 클라이언트(마지막 값 반복). usage 도 반환. */
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
  short: { headline: '짧은 제목', coreText: '핵심 한 문장.' },
  normal: { headline: '보통 제목', coreText: '핵심 요점과 왜 중요한지 맥락을 담은 두 문장.' },
  long: {
    headline: '긴 제목',
    facts: [
      { text: '매출이 전년 대비 20% 증가했다.', key: true },
      { text: '신규 고객이 크게 늘었다.', key: false },
    ],
    insights: [{ text: '추가 성장 여력이 있음을 시사한다.', key: false }],
  },
});

describe('allModesSystemPrompt (REQ-A2/D1 — 프롬프트 문안 계약)', () => {
  it('정보 계층·2단락·근거·보수적 교정을 지시한다', () => {
    const p = allModesSystemPrompt('ko');
    expect(p).toContain('TL;DR');
    expect(p).toContain('facts');
    expect(p).toContain('insights');
    expect(p).toContain('단조성');
    expect(p).toMatch(/과교정 금지|지어내지 마라/); // S4: 과교정 방지 지시
    expect(p).toContain('S&P500'); // 명백 오인식 교정 예시
    expect(p).toContain('한국어');
  });

  it('S4: 채널 도메인 힌트를 프롬프트에 주입한다', () => {
    const p = allModesSystemPrompt('ko', {
      channelTitle: '삼프로TV',
      videoTitle: '금리 인상 전망',
      terms: ['S&P500', '연준'],
    });
    expect(p).toContain('삼프로TV');
    expect(p).toContain('금리 인상 전망');
    expect(p).toContain('S&P500');
  });
});

describe('summarizeAllModes (단일 호출 3종 — REQ-CO1)', () => {
  it('1콜·전사 1회·reasoning low·structured 반환·usage 기록', async () => {
    const { create, client } = mockClient([validAll]);
    const { structured, ceiling, usage } = await summarizeAllModes('전사텍스트XYZ', 'ko', { client });

    expect(create).toHaveBeenCalledTimes(1);
    expect(usage.calls).toBe(1);
    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5-nano');
    expect(args.reasoning_effort).toBe('low'); // long 포함 단일 호출 → low
    expect(args.temperature).toBeUndefined();
    expect((args.response_format as { type: string }).type).toBe('json_schema');
    const msgs = JSON.stringify(args.messages);
    expect(msgs.split('전사텍스트XYZ').length - 1).toBe(1); // 전사 1회

    expect(ceiling).toBe('long');
    expect(structured.short.coreText).toBe('핵심 한 문장.');
    expect(structured.long.facts.length).toBe(2); // 2단락 사실
    expect(structured.long.insights.length).toBe(1); // 2단락 인사이트
    expect(structured.long.facts.some((s) => s.key)).toBe(true); // 하이라이트 존재
  });

  it('S4: hint 를 넘기면 첫 호출 시스템 프롬프트에 채널명이 포함된다', async () => {
    const { create, client } = mockClient([validAll]);
    await summarizeAllModes('전사', 'ko', { client }, { hint: { channelTitle: '삼프로TV' } });
    const sys = (create.mock.calls[0][0].messages as { role: string; content: string }[])[0];
    expect(sys.content).toContain('삼프로TV');
  });

  it('S3: depthCeiling=short 이면 상위 모드 미제공(ceiling=short)', async () => {
    const shallow = JSON.stringify({
      depthCeiling: 'short',
      short: { headline: 't', coreText: '짧은 잡담 요약 한 줄.' },
      normal: { headline: 't', coreText: '.' },
      long: { headline: 't', facts: [{ text: '.', key: true }], insights: [] },
    });
    const { client } = mockClient([shallow]);
    const { ceiling } = await summarizeAllModes('짧은 전사', 'ko', { client });
    expect(ceiling).toBe('short');
  });

  it('S1: 구조 재시도 시 2번째 호출엔 전사 미포함', async () => {
    const bad = JSON.stringify({
      depthCeiling: 'long',
      short: { headline: 't', coreText: '핵심.' },
      normal: { headline: 't', coreText: '맥락 문장.' },
      long: { headline: 't', facts: [], insights: [] }, // facts 비어 구조 미달
    });
    const { create, client } = mockClient([bad, validAll]);
    await summarizeAllModes('전사텍스트XYZ', 'ko', { client });
    expect(create).toHaveBeenCalledTimes(2);
    const second = JSON.stringify(create.mock.calls[1][0].messages);
    expect(second.includes('전사텍스트XYZ')).toBe(false);
  });

  it('빈 응답 반복이면 최종 예외', async () => {
    const { create, client } = mockClient([null]);
    await expect(summarizeAllModes('전사', 'ko', { client })).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(3);
  });
});

describe('resolveProvidedCeiling — 단조성 방어 (S1: 역전 0건)', () => {
  const base: StructuredSummaries = {
    depthCeiling: 'long',
    short: { headline: 't', coreText: '가나다.' },
    normal: { headline: 't', coreText: '가나다라마바사아자차카타파.' },
    long: { headline: 't', facts: [{ text: '가나.', key: true }], insights: [] },
  };

  it('long 이 normal 보다 짧으면 long 을 제공에서 낮춘다(→normal)', () => {
    // long 결합 텍스트가 normal 보다 짧음 → 역전. 방어로 ceiling=normal.
    expect(informationLength(longBodyToText(base.long))).toBeLessThan(
      informationLength(base.normal.coreText),
    );
    expect(resolveProvidedCeiling(base)).toBe('normal');
  });

  it('정상 단조면 ceiling 유지(long)', () => {
    const ok: StructuredSummaries = {
      ...base,
      long: {
        headline: 't',
        facts: [{ text: '가나다라마바사아자차카타파하가나다라마바.', key: true }],
        insights: [{ text: '가나다라마바사아자차.', key: false }],
      },
    };
    expect(resolveProvidedCeiling(ok)).toBe('long');
  });

  it('PROMPT_VERSION 이 정의되어 있다(회귀 비교용)', () => {
    expect(PROMPT_VERSION).toMatch(/^sq-/);
  });
});
