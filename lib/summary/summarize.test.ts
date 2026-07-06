import { describe, it, expect, vi } from 'vitest';
import { summarize } from './summarize';
import type OpenAI from 'openai';

/** 지정한 content 들을 순서대로 반환하는 mock OpenAI 클라이언트(마지막 값 반복). */
function mockClient(contents: (string | null)[]) {
  const create = vi.fn<
    (args: Record<string, unknown>) => Promise<{ choices: { message: { content: string | null } }[] }>
  >(async () => {
    const content = contents.length > 1 ? contents.shift()! : contents[0];
    return { choices: [{ message: { content } }] };
  });
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
}

const shortValid = JSON.stringify({
  headline: '한 줄 제목',
  coreText: '핵심을 담은 한 문장.',
  bullets: ['요점 하나', '요점 둘'],
});

describe('summarize (GPT-5-nano)', () => {
  it('유효 응답을 Summary 로 파싱하고 reasoning 모델 파라미터로 호출', async () => {
    const { create, client } = mockClient([shortValid]);
    const result = await summarize('전사 텍스트', 'short', 'ko', { client });

    expect(result.headline).toBe('한 줄 제목');
    expect(result.bullets).toEqual(['요점 하나', '요점 둘']);

    const args = create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5-nano');
    expect(args.max_completion_tokens).toBeGreaterThan(0);
    expect(args.reasoning_effort).toBeDefined();
    expect(args.temperature).toBeUndefined(); // reasoning 모델은 temperature 미지원
    expect((args.response_format as { type: string }).type).toBe('json_schema');
  });

  it('빈 응답이 반복되면 최종적으로 예외', async () => {
    const { create, client } = mockClient([null]);
    await expect(summarize('전사', 'short', 'ko', { client })).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(3); // 3회 재시도
  });

  it('형식 미달이면 재시도하고 best-effort 로 반환', async () => {
    const badFormat = JSON.stringify({
      headline: '제목',
      coreText: '한 문장.',
      bullets: ['하나만'], // short 최소 2개 미달
    });
    const { create, client } = mockClient([badFormat]);
    const result = await summarize('전사', 'short', 'ko', { client });
    expect(create).toHaveBeenCalledTimes(3); // 형식 미달로 3회 소진
    expect(result.headline).toBe('제목'); // best-effort 반환
  });
});
