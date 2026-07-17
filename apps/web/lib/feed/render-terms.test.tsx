import { describe, it, expect } from 'vitest';
import { renderWithTerms } from './render-terms';

const wrap = (t: { term: string }, key: string) => ({ key, term: t.term }) as unknown as React.ReactNode;

describe('renderWithTerms', () => {
  it('용어 없거나 매칭 없으면 원문 문자열 그대로', () => {
    expect(renderWithTerms('평범한 문장', [], wrap)).toBe('평범한 문장');
    expect(renderWithTerms('평범한 문장', [{ term: '없음', definition: 'x' }], wrap)).toBe('평범한 문장');
    expect(renderWithTerms('', [{ term: 'a', definition: 'x' }], wrap)).toBe('');
  });

  it('용어를 토큰화해 노드 배열로 반환(앞뒤 텍스트 보존)', () => {
    const out = renderWithTerms('오늘 NPU 성능이 좋다', [{ term: 'NPU', definition: '신경망 처리장치' }], wrap) as unknown[];
    expect(Array.isArray(out)).toBe(true);
    expect(out[0]).toBe('오늘 ');
    expect((out[1] as { term: string }).term).toBe('NPU');
    expect(out[2]).toBe(' 성능이 좋다');
  });

  it('용어당 첫 출현만 감싼다', () => {
    const out = renderWithTerms('NPU 그리고 NPU', [{ term: 'NPU', definition: 'x' }], wrap) as unknown[];
    const wrapped = out.filter((n) => typeof n !== 'string');
    expect(wrapped).toHaveLength(1);
    expect(out[out.length - 1]).toBe(' 그리고 NPU');
  });

  it('겹치는 용어는 긴 용어 우선', () => {
    const out = renderWithTerms(
      '에이전틱 AI 시대',
      [
        { term: 'AI', definition: '인공지능' },
        { term: '에이전틱 AI', definition: '자율 에이전트 AI' },
      ],
      wrap,
    ) as unknown[];
    const wrapped = out.filter((n) => typeof n !== 'string') as { term: string }[];
    expect(wrapped).toHaveLength(1);
    expect(wrapped[0].term).toBe('에이전틱 AI');
  });
});
