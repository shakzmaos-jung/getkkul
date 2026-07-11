import OpenAI from 'openai';
import {
  LENGTH_SPECS,
  validateSummaryFormat,
  type LengthMode,
  type SummaryLanguage,
  type Summary,
} from '@/lib/summary/format';

/**
 * 전사 텍스트 → 구조화 요약 (SSR REQ-D1/D2). OpenAI GPT-5-nano + 구조화 출력(json_schema strict).
 * 요약은 한국어 기본, language='en' 이면 영어(AC-D1.1/D3). summarize() 인터페이스 뒤에
 * 프로바이더를 격리한다(ADR-0001). 저비용 목적으로 Haiku 4.5 → GPT-5-nano 로 교체(2026-07-06).
 * GPT-5-nano 는 reasoning 모델: max_completion_tokens 사용, temperature 미지원, reasoning_effort 로 깊이 조절.
 */

const MODEL = 'gpt-5-nano';
// 요약은 추론 부하가 낮아 reasoning_effort 를 낮게 둬 토큰·지연을 아낀다(품질 미달 시 'medium' 로 상향).
const REASONING_EFFORT = 'low' as const;
// reasoning + 출력 토큰 합산 상한. reasoning 모델은 상한이 빡빡하면 빈 응답이 나므로 여유를 둔다.
const MAX_COMPLETION_TOKENS = 8192;

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    coreText: { type: 'string' },
  },
  required: ['headline', 'coreText'],
  additionalProperties: false,
} as const;

function systemPrompt(mode: LengthMode, language: SummaryLanguage): string {
  const spec = LENGTH_SPECS[mode];
  const lang =
    language === 'ko'
      ? '요약은 반드시 한국어로 작성한다(원문이 영어여도 한국어로).'
      : 'Write the entire summary in English.';
  const detail =
    mode === 'long'
      ? 'coreText 에는 핵심뿐 아니라 구체적 수치·사례·실행 요점 등 정보 가치가 높은 세부까지 문장으로 빠짐없이 담아 상세하게 작성한다.'
      : 'coreText 에는 정보 가치가 높은 핵심만 간결하게 담는다.';
  return [
    '너는 유튜브 영상 전사를 핵심만 뽑아 요약하는 전문가다.',
    lang,
    '다음 형식을 지켜라:',
    `- headline: 한 줄 제목`,
    `- coreText: 핵심 내용 ${spec.coreSentencesMin}~${spec.coreSentencesMax}문장`,
    detail,
    '광고·인사말·잡담은 제외하고 정보 가치가 높은 내용만 담아라.',
  ].join('\n');
}

function extractSummary(content: string | null): Summary {
  if (!content || !content.trim()) {
    throw new Error('요약 응답이 비어 있습니다.');
  }
  const parsed = JSON.parse(content) as Pick<Summary, 'headline' | 'coreText'>;
  return {
    headline: parsed.headline,
    coreText: parsed.coreText,
    bullets: [], // 불릿 폐지 — 저장 호환 위해 빈 배열.
  };
}

export async function summarize(
  transcript: string,
  mode: LengthMode,
  language: SummaryLanguage,
  deps: { client?: OpenAI } = {},
): Promise<Summary> {
  const client = deps.client ?? new OpenAI();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(mode, language) },
    { role: 'user', content: `다음 영상 전사를 요약하라:\n\n${transcript}` },
  ];

  let last: Summary | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      reasoning_effort: REASONING_EFFORT,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'summary', strict: true, schema: SUMMARY_SCHEMA },
      },
    });

    // strict json_schema 로 형식은 보장되지만 드물게 빈 응답/파싱 실패를 재시도로 흡수한다.
    let candidate: Summary;
    try {
      candidate = extractSummary(res.choices[0]?.message?.content ?? null);
    } catch (e) {
      console.warn(`[summarize] 응답 파싱 실패(재시도): ${(e as Error).message}`);
      messages.push({ role: 'user', content: '반드시 유효한 JSON 으로만 응답하라.' });
      continue;
    }
    last = candidate;

    const check = validateSummaryFormat(candidate, mode);
    if (check.valid) return candidate;

    // 형식(문장 수/불릿 수) 미달이면 교정 요청
    messages.push(
      { role: 'assistant', content: JSON.stringify(candidate) },
      {
        role: 'user',
        content: `형식 조건을 지키지 못했다: ${check.errors.join(' ')} 형식에 맞게 다시 작성하라.`,
      },
    );
  }

  if (!last) throw new Error('요약 JSON 파싱에 반복 실패했습니다.');
  // 형식 미달이어도 best-effort 로 반환(발송 자체는 막지 않음).
  console.warn('[summarize] 형식 검증 최종 실패 — best-effort 반환');
  return last;
}
