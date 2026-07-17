import OpenAI from 'openai';

const MODEL = 'gpt-5-nano';
export const GLOSSARY_PROMPT_VERSION = 'gl-2026-07-17.1';

const SCHEMA = {
  type: 'object',
  properties: {
    definitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { term: { type: 'string' }, definition: { type: 'string' } },
        required: ['term', 'definition'],
        additionalProperties: false,
      },
    },
  },
  required: ['definitions'],
  additionalProperties: false,
} as const;

/**
 * 용어 목록 → 일반 한국어 정의(용어 표기 유지, 특정 콘텐츠 무관한 일반 정의). 전역 용어사전용.
 * 용어당 1회만 호출되도록 상류(defineGlossaryPending)에서 미정의 용어만 넘긴다(비용 절감).
 */
export async function defineTerms(
  terms: string[],
  deps: { client?: OpenAI } = {},
): Promise<{ term: string; definition: string }[]> {
  if (terms.length === 0) return [];
  const client = deps.client ?? new OpenAI();
  const res = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 4096,
    reasoning_effort: 'low',
    messages: [
      {
        role: 'system',
        content:
          '너는 용어 사전 편집자다. 각 용어에 대해 일반 독자가 이해할 수 있는 한국어 정의를 1~2문장으로 간결히 쓴다. 용어 표기는 입력 그대로 유지하고, 특정 영상 맥락이 아니라 그 용어 자체의 일반적 의미를 정의한다. 확실히 모르는 용어는 definition 을 빈 문자열로 둔다.',
      },
      { role: 'user', content: `다음 용어들의 정의를 작성하라:\n${terms.map((t) => `- ${t}`).join('\n')}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'glossary_definitions', strict: true, schema: SCHEMA },
    },
  });
  const content = res.choices[0]?.message?.content;
  if (!content) return [];
  try {
    const p = JSON.parse(content) as { definitions?: { term?: unknown; definition?: unknown }[] };
    const wanted = new Set(terms);
    return (p.definitions ?? [])
      .map((d) => ({
        term: typeof d.term === 'string' ? d.term.trim() : '',
        definition: typeof d.definition === 'string' ? d.definition.trim() : '',
      }))
      .filter((d) => d.term && d.definition && wanted.has(d.term));
  } catch {
    return [];
  }
}
