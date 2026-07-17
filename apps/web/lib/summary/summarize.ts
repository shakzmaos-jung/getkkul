import OpenAI from 'openai';
import {
  LENGTH_MODES,
  providedModes,
  longBodyToText,
  pointsToText,
  checkMonotonicity,
  type SummaryLanguage,
  type StructuredSummaries,
  type LengthMode,
  type DepthCeiling,
} from '@/lib/summary/format';

/**
 * 전사 텍스트 → 정보 계층 구조화 요약 (요약품질 SSR 부록 REQ-A/B/C/D, ADR-0013/0014).
 * OpenAI GPT-5-nano + 구조화 출력(json_schema strict). summarize() 인터페이스 뒤에 프로바이더 격리(ADR-0001).
 *
 * 정보 계층을 **불릿 배열**로 단일 호출 생성한다(전사 1회 전송, REQ-CO1).
 * - 요점(short)/핵심(normal) = points 불릿, 심층(long) = 핵심 사실(facts) + 맥락·인사이트(insights) 불릿.
 * - depthCeiling 적응형, 단조성 방어(길이 역전 차단), 채널 도메인 힌트로 보수적 용어 교정. 하이라이트 폐지.
 */

const MODEL = 'gpt-5-nano';
// 심층이 정보 계층·근거·교정 지시를 포함 → 단일 3종 호출을 reasoning_effort='low' 로 둔다(💰 무시 가능).
const REASONING_EFFORT = 'low' as const;
const MAX_COMPLETION_TOKENS = 16384;

/** 시스템 프롬프트 버전(회귀 비교·피드백 지표 연결용). 변경 시 반드시 증가. */
export const PROMPT_VERSION = 'sq-2026-07-17.1';

/** 요약 생성에 주입하는 채널/콘텐츠 힌트(보수적 용어 교정 근거, REQ-D1). */
export interface DomainHint {
  channelTitle?: string | null;
  videoTitle?: string | null;
  terms?: string[]; // content_terms 용어집(선택)
}

const POINTS_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'points'],
  additionalProperties: false,
} as const;

const LONG_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    facts: { type: 'array', items: { type: 'string' } },
    insights: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'facts', 'insights'],
  additionalProperties: false,
} as const;

/** 3모드 + 콘텐츠 깊이 판정을 한 번에 내는 구조화 스키마(REQ-A1/C1). */
const ALL_MODE_SCHEMA = {
  type: 'object',
  properties: {
    depthCeiling: { type: 'string', enum: ['short', 'normal', 'long'] },
    short: POINTS_SCHEMA,
    normal: POINTS_SCHEMA,
    long: LONG_SCHEMA,
    terms: { type: 'array', items: { type: 'string' } },
  },
  required: ['depthCeiling', 'short', 'normal', 'long', 'terms'],
  additionalProperties: false,
} as const;

export interface SummaryUsage {
  promptTokens: number;
  completionTokens: number;
  calls: number; // 이 영상·언어 요약에 든 LLM 호출 수(정상 1, 재시도 시 증가)
}

/** 채널/제목/용어집 힌트를 프롬프트 문장으로. 없으면 빈 배열. */
function hintLines(hint?: DomainHint): string[] {
  if (!hint) return [];
  const lines: string[] = [];
  const meta = [
    hint.channelTitle && `채널 «${hint.channelTitle}»`,
    hint.videoTitle && `제목 «${hint.videoTitle}»`,
  ]
    .filter(Boolean)
    .join(' · ');
  if (meta) lines.push(`이 영상의 맥락: ${meta}. 이 도메인을 근거로 전사의 명백한 용어 오인식만 판단하라.`);
  if (hint.terms && hint.terms.length > 0) {
    lines.push(`이 채널에서 자주 쓰는 용어(참고): ${hint.terms.slice(0, 12).join(', ')}.`);
  }
  return lines;
}

/**
 * 정보 계층 3종 생성 시스템 프롬프트(REQ-A2). "몇 문장"이 아니라 "무엇을·어떤 층위로"를 지시한다.
 * 테스트·문서에서 문안을 직접 검증할 수 있도록 export 한다.
 */
export function allModesSystemPrompt(language: SummaryLanguage, hint?: DomainHint): string {
  const lang =
    language === 'ko'
      ? '모든 요약은 반드시 한국어로 작성한다(원문이 영어여도 한국어로).'
      : 'Write every summary in English.';
  return [
    '너는 유튜브 영상 전사에서 정보 가치가 높은 핵심을 정보 계층으로 요약하는 전문가다.',
    lang,
    '하나의 전사에 대해 상세도가 다른 3단계 요약을 한 번에 생성한다. 셋 다 정보 가치가 높은 핵심만 담되, 얼마나 자세히 담느냐로 구분한다. 각 요약은 한 문장짜리 불릿 배열이다:',
    '- short(간단히): 이 영상이 다루는 주제가 무엇이고 결론(핵심 주장·제안·답)이 무엇인지 + 가장 중요한 사실 2~3개만 불릿(points)으로. 시청자가 10~20초에 "무슨 얘기고 결론이 뭔지"를 파악할 만큼. 짧고 본질만.',
    '- normal(자세히): 영상에서 다룬 내용을 특정 부분에 치우치지 말고 고르게·빠짐없이 담되, 너무 길지 않게 적당히 충실하게 불릿(points)으로. 이것만 읽어도 영상을 굳이 안 봐도 될 만큼 핵심을 완결적으로.',
    '- long(최대한): 분량이 길어져도 좋으니 언급된 내용을 최대한 자세히 담는다. 구체적 수치·사례·예시·인용까지 포함한다. facts = 그 상세한 커버리지 불릿(자세히보다 더 풍부하게), insights = 그 내용에서 자연스럽게 도출되는 핵심 함의가 분명히 있을 때만 간결한 불릿으로(없거나 빈약하면 빈 배열로 두고 억지로 만들지 않는다).',
    '각 불릿은 한 문장으로 완결한다(문장 앞에 "-"나 기호를 붙이지 말고 문장만 넣는다).',
    '정보 계층(단조성): 상위 깊이는 하위를 포함하고 확장한다. 반드시 정보량이 short ≤ normal ≤ long 이 되도록, 상위일수록 더 깊고 구체적으로 쓴다. 상위가 하위보다 얕거나 짧아서는 안 된다.',
    '적응형 깊이: 콘텐츠가 빈약해 깊은 요약이 무리라면 depthCeiling 을 낮게 판정한다(예: 잡담·아주 짧은 영상 → "short"). depthCeiling 위의 모드는 억지로 부풀리지 말고 핵심만 간단히 두라(우리가 사용자에게 제공하지 않는다). 내용이 충분하면 "long".',
    '근거 준수: 원문 전사에 없는 내용을 지어내지 않는다(함의·해석도 반드시 전사의 사실에 근거한다).',
    '보수적 오타·용어 교정: 요약에 반영할 때 (1) 잘 알려진 고유명사·전문용어의 명백한 오인식(예 "SMP 500"→"S&P500")과 (2) 명백한 띄어쓰기·조사·오탈자·동음이의 오인식을 자연스러운 한국어로 바로잡는다. 단 발음이 비슷하다는 이유로 원문에 없던 고유명사·개체를 지어내지 마라. 의미가 바뀌거나 확실하지 않으면 원문 표현을 그대로 둔다(과교정 금지).',
    '용어 추출: 일반 독자가 모를 만한 어려운·전문 용어(개념·기술·전문용어)를 요약 본문에 등장하는 표기 그대로 최대 8개까지 terms 배열에 담는다(없으면 빈 배열). 흔한 일반 단어는 제외하고, 정의를 알면 이해가 쉬워지는 것 위주로.',
    ...hintLines(hint),
    '광고·인사말·잡담·구독요청은 제외하고 정보 가치가 높은 내용만 담아라.',
  ].join('\n');
}

/** depthCeiling 문자열을 유효 모드로 정규화(불명확하면 long = 전부 제공). */
function normalizeCeiling(v: unknown): DepthCeiling {
  return typeof v === 'string' && (LENGTH_MODES as readonly string[]).includes(v)
    ? (v as DepthCeiling)
    : 'long';
}

function toStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? x : ''))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 모드별 렌더 텍스트(단조성 판정 기준). long 은 facts+insights 결합. */
function textOf(s: StructuredSummaries, mode: LengthMode): string {
  if (mode === 'long') return longBodyToText(s.long);
  return pointsToText(s[mode].points);
}

/**
 * 최종 제공 깊이(ceiling)를 정한다: 모델 판정 ceiling 에서 시작해, 제공 모드들이 단조성을
 * 만족할 때까지 상위 모드를 낮춘다(방어 — 역전은 사용자에게 노출하지 않는다).
 */
export function resolveProvidedCeiling(s: StructuredSummaries): DepthCeiling {
  let ceiling = normalizeCeiling(s.depthCeiling);
  const order: LengthMode[] = ['long', 'normal', 'short'];
  for (;;) {
    const provided = providedModes(ceiling);
    const textByMode: Partial<Record<LengthMode, string>> = {};
    for (const m of provided) textByMode[m] = textOf(s, m);
    if (checkMonotonicity(textByMode).valid) return ceiling;
    if (ceiling === 'short') return 'short';
    ceiling = order[order.indexOf(ceiling) + 1];
  }
}

function extractStructured(content: string | null): { structured: StructuredSummaries; terms: string[] } {
  if (!content || !content.trim()) throw new Error('요약 응답이 비어 있습니다.');
  const p = JSON.parse(content) as {
    depthCeiling?: unknown;
    short?: { headline?: unknown; points?: unknown };
    normal?: { headline?: unknown; points?: unknown };
    long?: { headline?: unknown; facts?: unknown; insights?: unknown };
    terms?: unknown;
  };
  const flat = (m: 'short' | 'normal') => ({
    headline: typeof p[m]?.headline === 'string' ? (p[m]!.headline as string) : '',
    points: toStrings(p[m]?.points),
  });
  return {
    structured: {
      depthCeiling: normalizeCeiling(p.depthCeiling),
      short: flat('short'),
      normal: flat('normal'),
      long: {
        headline: typeof p.long?.headline === 'string' ? p.long!.headline : '',
        facts: toStrings(p.long?.facts),
        insights: toStrings(p.long?.insights),
      },
    },
    terms: toStrings(p.terms).slice(0, 8),
  };
}

/** 구조 검증: 제공 모드의 불릿이 채워졌는지(REQ-A1). */
function structuralErrors(s: StructuredSummaries): string[] {
  const errs: string[] = [];
  const provided = providedModes(normalizeCeiling(s.depthCeiling));
  for (const m of provided) {
    if (m === 'long') {
      if (s.long.facts.length === 0) errs.push('long.facts 가 비어 있다');
      if (!s.long.headline?.trim()) errs.push('long.headline 이 비어 있다');
    } else {
      if (s[m].points.length === 0) errs.push(`${m}.points 가 비어 있다`);
      if (!s[m].headline?.trim()) errs.push(`${m}.headline 이 비어 있다`);
    }
  }
  return errs;
}

/**
 * 전사를 1회만 전송해 short/normal/long 3종을 단일 호출로 생성한다(REQ-CO1).
 * 구조 검증 미달 시 최대 3회 교정(전사 미포함 재정형, REQ-CO3). 단조성은 항상 방어 적용.
 */
export async function summarizeAllModes(
  transcript: string,
  language: SummaryLanguage,
  deps: { client?: OpenAI } = {},
  opts: { hint?: DomainHint } = {},
): Promise<{ structured: StructuredSummaries; ceiling: DepthCeiling; usage: SummaryUsage; terms: string[] }> {
  const client = deps.client ?? new OpenAI();
  const sys: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: 'system',
    content: allModesSystemPrompt(language, opts.hint),
  };
  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    sys,
    { role: 'user', content: `다음 영상 전사를 요약하라:\n\n${transcript}` },
  ];
  const usage: SummaryUsage = { promptTokens: 0, completionTokens: 0, calls: 0 };
  let last: StructuredSummaries | null = null;
  let lastTerms: string[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      reasoning_effort: REASONING_EFFORT,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'hierarchical_summary', strict: true, schema: ALL_MODE_SCHEMA },
      },
    });
    usage.calls += 1;
    usage.promptTokens += res.usage?.prompt_tokens ?? 0;
    usage.completionTokens += res.usage?.completion_tokens ?? 0;

    let parsed: StructuredSummaries;
    let terms: string[];
    try {
      const ex = extractStructured(res.choices[0]?.message?.content ?? null);
      parsed = ex.structured;
      terms = ex.terms;
    } catch (e) {
      console.warn(`[summarize] 응답 파싱 실패(재시도): ${(e as Error).message}`);
      messages = [sys, { role: 'user', content: '반드시 유효한 JSON 으로만 응답하라.' }];
      continue;
    }
    last = parsed;
    lastTerms = terms;

    const errs = structuralErrors(parsed);
    if (errs.length === 0) {
      return { structured: parsed, ceiling: resolveProvidedCeiling(parsed), usage, terms };
    }
    // 교정 재시도 — 전사 미포함(REQ-CO3). 직전 출력(JSON)만으로 구조 재정형.
    messages = [
      sys,
      { role: 'assistant', content: JSON.stringify(parsed) },
      { role: 'user', content: `다음 구조 조건을 고쳐 전체를 다시 JSON 으로 출력하라: ${errs.join(' / ')}` },
    ];
  }

  if (!last) throw new Error('요약 JSON 파싱에 반복 실패했습니다.');
  console.warn('[summarize] 구조 검증 최종 실패 — best-effort 반환');
  return { structured: last, ceiling: resolveProvidedCeiling(last), usage, terms: lastTerms };
}
