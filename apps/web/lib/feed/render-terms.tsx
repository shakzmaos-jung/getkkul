import type { ReactNode } from 'react';

export type GlossaryTerm = { term: string; definition: string };

/**
 * 텍스트에서 glossary 용어를 찾아 클릭 가능한 노드로 감싼다.
 * - 용어당 **첫 출현만**(중복 강조 방지), **긴 용어 우선**(부분 겹침 시 더 구체적 용어 채택).
 * - 매칭이 없으면 원문 문자열을 그대로 반환(추가 DOM 없음).
 * renderTerm(term, key) 는 클릭 시 정의를 보여주는 노드(TermTooltip)를 만든다.
 */
export function renderWithTerms(
  text: string,
  terms: GlossaryTerm[],
  renderTerm: (t: GlossaryTerm, key: string) => ReactNode,
): ReactNode {
  if (!text || terms.length === 0) return text;
  const sorted = [...terms].filter((t) => t.term).sort((a, b) => b.term.length - a.term.length);

  type Hit = { start: number; end: number; t: GlossaryTerm };
  const hits: Hit[] = [];
  const used: boolean[] = new Array(text.length).fill(false);
  for (const t of sorted) {
    const idx = text.indexOf(t.term);
    if (idx < 0) continue;
    let overlap = false;
    for (let i = idx; i < idx + t.term.length; i++) {
      if (used[i]) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;
    for (let i = idx; i < idx + t.term.length; i++) used[i] = true;
    hits.push({ start: idx, end: idx + t.term.length, t });
  }
  if (hits.length === 0) return text;

  hits.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    if (h.start > cursor) out.push(text.slice(cursor, h.start));
    out.push(renderTerm(h.t, `t${i}`));
    cursor = h.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
