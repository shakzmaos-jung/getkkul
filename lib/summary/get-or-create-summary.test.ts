/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { getOrCreateSummaries } from './get-or-create-summary';
import type OpenAI from 'openai';

const allValid = JSON.stringify({
  short: { headline: 's', coreText: '한 문장.' },
  normal: { headline: 'n', coreText: '문장1. 문장2.' },
  long: { headline: 'l', coreText: '문장1. 문장2. 문장3. 문장4. 문장5. 문장6.' },
});

function openaiMock() {
  const create = vi.fn(async () => ({
    choices: [{ message: { content: allValid } }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  }));
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
}

/** summaries.select().eq().eq() 는 await(then), videos.select().eq().single(), summaries.upsert() 를 지원. */
function supa(opts: { existingModes: string[]; transcript?: string | null; status?: string }) {
  const { existingModes, transcript = '전사', status = 'done' } = opts;
  const upserts: { rows: any[] }[] = [];
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve({ data: { transcript, status }, error: null }),
    then: (r: any) =>
      Promise.resolve({ data: existingModes.map((m) => ({ length_mode: m })), error: null }).then(r),
    upsert: (rows: any[]) => {
      upserts.push({ rows });
      return Promise.resolve({ error: null });
    },
  };
  const client = { from: () => chain } as any;
  return { client, upserts };
}

describe('getOrCreateSummaries (REQ-CO1 캐시/배치)', () => {
  it('AC-CO1.4: 3모드 모두 캐시면 LLM 호출 0', async () => {
    const oa = openaiMock();
    const { client } = supa({ existingModes: ['short', 'normal', 'long'] });
    const r = await getOrCreateSummaries(client, 'v1', 'ko', { client: oa.client });
    expect(oa.create).not.toHaveBeenCalled();
    expect(r.generated).toBe(0);
    expect(r.usage).toBeNull();
  });

  it('AC-CO1.3: 누락 시 단일 호출로 3종 생성·저장', async () => {
    const oa = openaiMock();
    const { client, upserts } = supa({ existingModes: [] });
    const r = await getOrCreateSummaries(client, 'v1', 'ko', { client: oa.client });
    expect(oa.create).toHaveBeenCalledTimes(1); // 영상당 정확히 1콜
    expect(r.generated).toBe(3);
    expect(upserts.length).toBe(1);
    expect(upserts[0].rows.map((x) => x.length_mode).sort()).toEqual(['long', 'normal', 'short']);
  });
});
