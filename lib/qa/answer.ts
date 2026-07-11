import OpenAI from 'openai';

/**
 * 콘텐츠 Q&A (사용자 요청 기능). 카드의 맥락(전사/요약)에 근거해 질문에 답한다.
 * OpenAI GPT-5-nano + 구조화 출력(json_schema)으로 '길게(자세히)' 답변 1종만 생성한다.
 * (AI 질의는 모르는 걸 묻는 것이라 자세한 답이 바람직 + 다길이 생성의 토큰/비용 낭비 제거.)
 * (reasoning 모델: max_completion_tokens 사용, temperature 미지원)
 */

const MODEL = 'gpt-5-nano';
const REASONING_EFFORT = 'low' as const;
const MAX_COMPLETION_TOKENS = 2048;

/** 질문 최대 길이. */
export const MAX_QUESTION_LEN = 200;
/** 맥락 최대 글자수(토큰·비용 상한). */
export const MAX_CONTEXT_LEN = 12000;
/** 추출 용어 칩 최대 개수. */
export const MAX_TERMS = 6;

/** 답변: 용어 정의 + 이 콘텐츠에서의 의미/인사이트(각 없으면 빈 문자열). 길게(자세히) 1종. */
export interface QASection {
  definition: string; // 용어 정의
  insight: string; // 이 콘텐츠에서의 의미와 인사이트
}

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { definition: { type: 'string' }, insight: { type: 'string' } },
  required: ['definition', 'insight'],
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
    '답변은 두 부분으로 나눈다:',
    '- definition: 질문 대상(용어/개념)의 일반적인 정의. 질문이 특정 용어 정의를 요구하지 않으면 빈 문자열.',
    '- insight: 이 콘텐츠에서 그것이 갖는 의미와 인사이트. 콘텐츠 맥락에 근거해 정리. 해당 내용이 없으면 빈 문자열.',
    'definition/insight 를 합쳐 800자 내외로 충분히 자세하게, 자연스럽게 완결된 문장으로 쓴다.',
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
): Promise<QASection> {
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
  const parsed = JSON.parse(content) as Partial<QASection>;
  return { definition: parsed.definition ?? '', insight: parsed.insight ?? '' };
}

const TERMS_SCHEMA = {
  type: 'object',
  properties: { terms: { type: 'array', items: { type: 'string' } } },
  required: ['terms'],
  additionalProperties: false,
} as const;

/**
 * 콘텐츠에서 일반인이 이해하기 어려운 전문용어·핵심 단어를 추출한다(칩 후보).
 * 어려운 단어가 없으면 빈 배열. 실패해도 빈 배열(칩 없이 진행).
 */
export async function extractTerms(
  input: { context: string },
  deps: { client?: OpenAI } = {},
): Promise<string[]> {
  const client = deps.client ?? new OpenAI();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1024,
    reasoning_effort: REASONING_EFFORT,
    messages: [
      {
        role: 'system',
        content: [
          `다음 콘텐츠에서 일반인이 이해하기 어려운 전문용어·핵심 어려운 단어를 최대 ${MAX_TERMS}개 뽑아라.`,
          '콘텐츠에 실제로 등장한 용어만 고른다. 어려운 단어가 없으면 빈 배열.',
          '각 항목은 짧은 명사(단어/구)로, 한국어 표기로.',
        ].join('\n'),
      },
      { role: 'user', content: input.context },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'terms', strict: true, schema: TERMS_SCHEMA },
    },
  });
  const content = res.choices[0]?.message?.content;
  if (!content) return [];
  try {
    const parsed = JSON.parse(content) as { terms?: unknown };
    const arr = Array.isArray(parsed.terms) ? parsed.terms : [];
    return arr
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, MAX_TERMS);
  } catch {
    return [];
  }
}
