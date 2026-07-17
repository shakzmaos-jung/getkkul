import { describe, it, expect } from 'vitest';
import { renderWithTerms, type GlossaryEntry } from './render-terms';

const E = (id: string, ko: string | null, en: string | null, def = 'def'): GlossaryEntry => ({
  id,
  termKo: ko,
  termEn: en,
  definition: def,
});

// renderTerm 을 마커로: [surface|id1,id2]. 반환 배열을 문자열로 재조립해 검증.
const render = (text: string, entries: GlossaryEntry[]) => {
  const out = renderWithTerms(text, entries, (ents, surface) => `[${surface}|${ents.map((e) => e.id).join(',')}]`);
  return typeof out === 'string' ? out : (out as unknown[]).join('');
};

describe('renderWithTerms v2', () => {
  it('매칭 없거나 빈 엔트리면 원문 그대로', () => {
    expect(render('그냥 문장', [E('1', '용어', null)])).toBe('그냥 문장');
    expect(render('아무것', [])).toBe('아무것');
    expect(render('', [E('1', 'a', null)])).toBe('');
  });

  it('단일 용어 · 영어 표기 매칭', () => {
    expect(render('이것은 NPU 칩', [E('1', null, 'NPU')])).toBe('이것은 [NPU|1] 칩');
  });

  it('엔트리는 ko/en 을 함께 가지되 본문에 나온 표기로 매칭', () => {
    expect(render('엔캐리 트레이드 주의', [E('1', '엔캐리 트레이드', 'Yen carry trade')])).toBe(
      '[엔캐리 트레이드|1] 주의',
    );
  });

  it('중첩: "Hermes 에이전트"⊃"에이전트" → 부분 스팬은 겹치는 엔트리 모두', () => {
    const out = render('Hermes 에이전트가', [E('A', 'Hermes 에이전트', null), E('B', '에이전트', null)]);
    expect(out).toBe('[Hermes |A][에이전트|A,B]가');
  });

  it('동음이의: 같은 표기·다른 id → 같은 스팬에 둘 다', () => {
    expect(render('에이전트란', [E('B1', '에이전트', null), E('B2', '에이전트', null)])).toBe(
      '[에이전트|B1,B2]란',
    );
  });

  it('표기당 첫 출현만 감싼다', () => {
    expect(render('용어 용어', [E('1', '용어', null)])).toBe('[용어|1] 용어');
  });

  it('alias 표기가 본문에 나오면 대표 엔트리로 매칭(툴팁은 대표명)', () => {
    const entry: GlossaryEntry = {
      id: 'K',
      termKo: '키미 3',
      termEn: 'Kimi 3',
      definition: 'def',
      aliases: ['키미3', '키미쓰리'],
    };
    expect(render('오늘 키미쓰리 공개', [entry])).toBe('오늘 [키미쓰리|K] 공개');
    expect(render('Kimi 3 발표', [entry])).toBe('[Kimi 3|K] 발표');
  });
});
