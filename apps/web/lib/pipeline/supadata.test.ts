import { describe, it, expect, vi } from 'vitest';
import { supadataCaption } from './supadata';

const VIDEO = { videoId: 'abc', url: 'https://youtu.be/abc' };
const noSleep = () => Promise.resolve();

function jsonRes(status: number, body: unknown): Response {
  return { status, json: async () => body } as unknown as Response;
}

describe('supadataCaption (REQ-C 관리형 폴백)', () => {
  it('키 없으면 no-op(null) — 폴백 비활성', async () => {
    const fetchFn = vi.fn();
    const r = await supadataCaption(VIDEO, { apiKey: '', fetchFn });
    expect(r).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('200: content 반환(x-api-key 헤더·url 파라미터)', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      jsonRes(200, { content: '  전사 내용  ', lang: 'ko' }),
    );
    const r = await supadataCaption(VIDEO, { apiKey: 'k', fetchFn });
    expect(r).toBe('전사 내용');
    const call = fetchFn.mock.calls[0];
    expect(String(call[0])).toContain('/v1/transcript?url=');
    expect(String(call[0])).toContain('text=true');
    expect(call[1]?.headers).toMatchObject({ 'x-api-key': 'k' });
  });

  it('200: 빈 content 는 null', async () => {
    const fetchFn = vi.fn(async () => jsonRes(200, { content: '   ' }));
    expect(await supadataCaption(VIDEO, { apiKey: 'k', fetchFn })).toBeNull();
  });

  it('202: jobId 폴링 → completed 시 content', async () => {
    const calls = [
      jsonRes(202, { jobId: 'job1' }),
      jsonRes(200, { status: 'active' }),
      jsonRes(200, { status: 'completed', content: 'AI 생성 전사' }),
    ];
    let i = 0;
    const fetchFn = vi.fn(async () => calls[i++]);
    const r = await supadataCaption(VIDEO, { apiKey: 'k', fetchFn, sleep: noSleep });
    expect(r).toBe('AI 생성 전사');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('202: failed 면 null', async () => {
    const calls = [jsonRes(202, { jobId: 'j' }), jsonRes(200, { status: 'failed' })];
    let i = 0;
    const fetchFn = vi.fn(async () => calls[i++]);
    expect(await supadataCaption(VIDEO, { apiKey: 'k', fetchFn, sleep: noSleep })).toBeNull();
  });

  it('404(비공개/삭제) 등은 null', async () => {
    const fetchFn = vi.fn(async () => jsonRes(404, {}));
    expect(await supadataCaption(VIDEO, { apiKey: 'k', fetchFn })).toBeNull();
  });

  it('예외는 null 로 흡수', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network');
    });
    expect(await supadataCaption(VIDEO, { apiKey: 'k', fetchFn })).toBeNull();
  });
});
