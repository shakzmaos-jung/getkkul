import OpenAI from 'openai';

const MODEL = 'gpt-5-nano';
export const GLOSSARY_PROMPT_VERSION = 'gl-2026-07-18.1';

const SCHEMA = {
  type: 'object',
  properties: {
    definitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' }, // 입력 표기 그대로(매칭 키)
          term_ko: { type: 'string' }, // 한국어 표기(없으면 빈 문자열)
          term_en: { type: 'string' }, // 영어 원어(없으면 빈 문자열)
          definition: { type: 'string' },
        },
        required: ['term', 'term_ko', 'term_en', 'definition'],
        additionalProperties: false,
      },
    },
  },
  required: ['definitions'],
  additionalProperties: false,
} as const;

export type TermDefinition = { termKo: string | null; termEn: string | null; definition: string };

const hasHangul = (s: string) => /[가-힣]/.test(s);

/**
 * 용어 표기 목록 → {한국어 표기, 영어 표기, 일반 한국어 정의}. 전역 용어사전용.
 * 매칭 무결성을 위해 **입력 표기는 감지된 언어 컬럼에 강제 고정**하고 반대 언어 원어만 LLM 값을 채택한다.
 * 용어당 1회만 호출되도록 상류(defineGlossaryPending)에서 미등록 표기만 넘긴다(비용 절감).
 */
export async function defineTerms(
  terms: string[],
  deps: { client?: OpenAI } = {},
): Promise<TermDefinition[]> {
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
          '너는 용어 사전 편집자다. 각 용어에 대해 (1) 한국어 표기(term_ko), (2) 영어 원어 표기(term_en), (3) 일반 독자용 한국어 정의(1~2문장)를 쓴다. ' +
          '입력 표기가 한국어면 term_ko 에 입력을 그대로 두고 대응하는 영어 원어를 term_en 에 넣는다(모르거나 없으면 빈 문자열). 입력이 영어면 term_en 에 그대로 두고 한국어 표기를 term_ko 에 넣는다(없으면 빈 문자열). ' +
          'term 필드에는 입력 표기를 그대로 반환한다. 특정 영상 맥락이 아니라 용어 자체의 일반적 의미를 정의하고, 확실히 모르는 용어는 definition 을 빈 문자열로 둔다.',
      },
      { role: 'user', content: `다음 용어들의 표기와 정의를 작성하라:\n${terms.map((t) => `- ${t}`).join('\n')}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'glossary_definitions', strict: true, schema: SCHEMA },
    },
  });
  const content = res.choices[0]?.message?.content;
  if (!content) return [];
  try {
    const p = JSON.parse(content) as {
      definitions?: { term?: unknown; term_ko?: unknown; term_en?: unknown; definition?: unknown }[];
    };
    const wanted = new Set(terms);
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    return (p.definitions ?? [])
      .map((d) => {
        const surface = str(d.term);
        let ko = str(d.term_ko);
        let en = str(d.term_en);
        // 입력 표기를 감지된 언어 컬럼에 강제 고정 → 본문 매칭 보존(LLM 표기 변형 방어).
        if (hasHangul(surface)) ko = surface;
        else en = surface;
        return { surface, termKo: ko || null, termEn: en || null, definition: str(d.definition) };
      })
      .filter((d) => d.surface && d.definition && wanted.has(d.surface))
      .map(({ termKo, termEn, definition }) => ({ termKo, termEn, definition }));
  } catch {
    return [];
  }
}
