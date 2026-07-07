import OpenAI from 'openai';

/**
 * 콘텐츠 Q&A (사용자 요청 기능). 카드의 맥락(전사/요약)에 근거해 질문에 답한다.
 * 요약과 동일하게 OpenAI GPT-5-nano + 구조화 출력(json_schema)으로 세 가지 길이 답변을 한 번에 생성한다.
 * (reasoning 모델: max_completion_tokens 사용, temperature 미지원)
 */

const MODEL = 'gpt-5-nano';
const REASONING_EFFORT = 'low' as const;
const MAX_COMPLETION_TOKENS = 4096;

/** 질문 최대 길이. */
export const MAX_QUESTION_LEN = 200;
/** 맥락 최대 글자수(토큰·비용 상한). */
export const MAX_CONTEXT_LEN = 12000;

export interface QAAnswer {
  short: string; // 80자 내외
  normal: string; // 200자 내외
  long: string; // 800자 내외
}

const ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    short: { type: 'string' },
    normal: { type: 'string' },
    long: { type: 'string' },
  },
  required: ['short', 'normal', 'long'],
  additionalProperties: false,
} as const;

/** 질문 유효성(비어있지 않음 + 200자 이내). */
export function validateQuestion(question: string): { ok: boolean; error?: string } {
  const q = (question ?? '').trim();
  if (!q) return { ok: false, error: '질문을 입력해 주세요.' };
  if (q.length > MAX_QUESTION_LEN) {
    return { ok: false, error: `질문은 ${MAX_QUESTION_LEN}자 이내로 입력해 주세요.` };
  }
  return { ok: true };
}

function systemPrompt(): string {
  return [
    '너는 주어진 유튜브 콘텐츠의 맥락에 근거해 사용자 질문에 답하는 도우미다.',
    '반드시 제공된 맥락에 근거해서 답하고, 맥락에서 알 수 없는 내용이면 모른다고 솔직히 답하라.',
    '답변은 한국어로 작성한다.',
    '같은 답을 세 가지 길이로 정리하라: short(80자 내외), normal(200자 내외), long(800자 내외).',
    '각 길이는 자연스럽게 완결된 문장으로 작성한다.',
  ].join('\n');
}

export function buildMessages(
  title: string,
  context: string,
  question: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: systemPrompt() },
    {
      role: 'user',
      content: `콘텐츠 제목: ${title}\n\n[콘텐츠 맥락]\n${context}\n\n[질문]\n${question}`,
    },
  ];
}

export async function answerAboutContent(
  input: { title: string; context: string; question: string },
  deps: { client?: OpenAI } = {},
): Promise<QAAnswer> {
  const client = deps.client ?? new OpenAI();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    reasoning_effort: REASONING_EFFORT,
    messages: buildMessages(input.title, input.context, input.question),
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'qa_answer', strict: true, schema: ANSWER_SCHEMA },
    },
  });
  const content = res.choices[0]?.message?.content;
  if (!content || !content.trim()) throw new Error('답변 응답이 비어 있습니다.');
  const parsed = JSON.parse(content) as Partial<QAAnswer>;
  return {
    short: parsed.short ?? '',
    normal: parsed.normal ?? '',
    long: parsed.long ?? '',
  };
}
