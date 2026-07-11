/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { getOrCreateSummaries } from './get-or-create-summary';
import type OpenAI from 'openai';

const allValid = JSON.stringify({
  depthCeiling: 'long',
  short: { headline: 's', coreText: '핵심 한 문장.' },
  normal: { headline: 'n', coreText: '핵심 요점과 맥락을 담은 두 문장 요약.' },
  long: {
    headline: 'l',
    facts: [{ text: '매출이 20% 늘었다는 구체 사실.', key: true }],
    insights: [{ text: '성장 여력이 있다는 시사점.', key: false }],
  },
});

function openaiMock(content = allValid) {
  const create = vi.fn(async () => ({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  }));
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
}

/** 테이블별 체인 stub. summaries(select→then, upsert), videos(single), 힌트 테이블(maybeSingle). */
function supa(opts: { existingModes: string[]; transcript?: string | null; status?: string }) {
  const { existingModes, transcript = '전사', status = 'done' } = opts;
  const upserts: { rows: any[] }[] = [];
  const make = (table: string): any => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      limit: () => chain,
      maybeSingle: () => {
        if (table === 'channel_catalog') return Promise.resolve({ data: { title: '삼프로TV' }, error: null });
        if (table === 'subscriptions')
          return Promise.resolve({ data: { channel_title: '삼프로TV' }, error: null });
        if (table === 'content_terms') return Promise.resolve({ data: { terms: [] }, error: null });
        return Promise.resolve({ data: null, error: null });
      },
      single: () =>
        Promise.resolve({
          data: { transcript, status, title: '금리 전망', channel_id: 'ch1' },
          error: null,
        }),
      then: (r: any) =>
        Promise.resolve({ data: existingModes.map((m) => ({ length_mode: m })), error: null }).then(r),
      upsert: (rows: any[]) => {
        upserts.push({ rows });
        return Promise.resolve({ error: null });
      },
    };
    return chain;
  };
  const client = { from: (t: string) => make(t) } as any;
  return { client, upserts };
}

describe('getOrCreateSummaries (요약품질 — 캐시/배치/구조화 저장)', () => {
  it('3모드 모두 캐시면 LLM 호출 0', async () => {
    const oa = openaiMock();
    const { client } = supa({ existingModes: ['short', 'normal', 'long'] });
    const r = await getOrCreateSummaries(client, 'v1', 'ko', { client: oa.client });
    expect(oa.create).not.toHaveBeenCalled();
    expect(r.generated).toBe(0);
    expect(r.usage).toBeNull();
  });

  it('누락 시 단일 호출로 3종 생성·구조화 저장(long body 2단락 + prompt_version)', async () => {
    const oa = openaiMock();
    const { client, upserts } = supa({ existingModes: [] });
    const r = await getOrCreateSummaries(client, 'v1', 'ko', { client: oa.client });
    expect(oa.create).toHaveBeenCalledTimes(1);
    expect(r.generated).toBe(3);
    expect(upserts.length).toBe(1);
    const rows = upserts[0].rows;
    expect(rows.map((x) => x.length_mode).sort()).toEqual(['long', 'normal', 'short']);
    expect(rows.every((x) => typeof x.prompt_version === 'string')).toBe(true);
    const long = rows.find((x) => x.length_mode === 'long');
    expect(long.body.facts.length).toBe(1); // 2단락 사실 저장
    expect(long.body.insights.length).toBe(1);
    expect(long.core_text).toContain('매출이 20% 늘었다'); // facts+insights 결합
  });

  it('AC-C1.3: depthCeiling=normal 이면 long 은 notProvided 로 저장', async () => {
    const shallow = JSON.stringify({
      depthCeiling: 'normal',
      short: { headline: 's', coreText: '짧은 핵심.' },
      normal: { headline: 'n', coreText: '핵심과 맥락을 담은 조금 더 긴 요약 문장.' },
      long: { headline: 'l', facts: [{ text: '.', key: true }], insights: [] },
    });
    const oa = openaiMock(shallow);
    const { client, upserts } = supa({ existingModes: [] });
    await getOrCreateSummaries(client, 'v1', 'ko', { client: oa.client });
    const long = upserts[0].rows.find((x) => x.length_mode === 'long');
    expect(long.body.notProvided).toBe(true);
    expect(long.core_text).toBe('');
    const short = upserts[0].rows.find((x) => x.length_mode === 'short');
    expect(short.body.notProvided).toBeUndefined();
  });
});
