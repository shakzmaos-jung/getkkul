import Anthropic from '@anthropic-ai/sdk';
import {
  LENGTH_SPECS,
  validateSummaryFormat,
  type LengthMode,
  type SummaryLanguage,
  type Summary,
} from '@/lib/summary/format';

/**
 * 전사 텍스트 → 구조화 요약 (SSR REQ-D1/D2). Claude Haiku 4.5 + 구조화 출력.
 * 요약은 한국어 기본, language='en' 이면 영어(AC-D1.1/D3). summarize() 인터페이스 뒤에
 * 프로바이더를 격리한다(ADR-0001, 저비용 Haiku). Haiku 4.5 는 effort/thinking 미지원.
 */

const MODEL = 'claude-haiku-4-5';

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    coreText: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'coreText', 'bullets'],
  additionalProperties: false,
} as const;

function systemPrompt(mode: LengthMode, language: SummaryLanguage): string {
  const spec = LENGTH_SPECS[mode];
  const lang =
    language === 'ko'
      ? '요약은 반드시 한국어로 작성한다(원문이 영어여도 한국어로).'
      : 'Write the entire summary in English.';
  return [
    '너는 유튜브 영상 전사를 핵심만 뽑아 요약하는 전문가다.',
    lang,
    '다음 형식을 지켜라:',
    `- headline: 한 줄 제목`,
    `- coreText: 핵심 내용 ${spec.coreSentencesMin}~${spec.coreSentencesMax}문장`,
    `- bullets: 상세 요점 ${spec.bulletsMin}~${spec.bulletsMax}개`,
    '광고·인사말·잡담은 제외하고 정보 가치가 높은 내용만 담아라.',
  ].join('\n');
}

function extractSummary(message: Anthropic.Message): Summary {
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('요약 응답에 텍스트 블록이 없습니다.');
  }
  const parsed = JSON.parse(textBlock.text) as Summary;
  return {
    headline: parsed.headline,
    coreText: parsed.coreText,
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
  };
}

export async function summarize(
  transcript: string,
  mode: LengthMode,
  language: SummaryLanguage,
  deps: { client?: Anthropic } = {},
): Promise<Summary> {
  const client = deps.client ?? new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: `다음 영상 전사를 요약하라:\n\n${transcript}` },
  ];

  let last: Summary | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 3072,
      system: systemPrompt(mode, language),
      messages,
      output_config: { format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
    });

    // 구조화 출력도 드물게 깨질 수 있어 파싱 실패를 재시도로 흡수한다.
    let candidate: Summary;
    try {
      candidate = extractSummary(message);
    } catch (e) {
      console.warn(`[summarize] JSON 파싱 실패(재시도): ${(e as Error).message}`);
      messages.push({ role: 'user', content: '반드시 유효한 JSON 으로만 응답하라.' });
      continue;
    }
    last = candidate;

    const check = validateSummaryFormat(candidate, mode);
    if (check.valid) return candidate;

    // 형식 미달이면 교정 요청
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
