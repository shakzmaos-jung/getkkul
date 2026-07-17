import type { ReactNode } from 'react';

/** 용어 사전 엔트리(고유 id). 한 이름에 여러 뜻(동음이의)은 서로 다른 id 로 온다. */
export type GlossaryEntry = {
  id: string;
  termKo: string | null;
  termEn: string | null;
  definition: string;
};

type Interval = { start: number; end: number; entry: GlossaryEntry };

/**
 * 텍스트에서 glossary 용어(표기 term_ko/term_en)를 찾아 클릭 가능한 노드로 감싼다.
 * - **겹침 허용 커버리지 세그먼트**: "Hermes 에이전트"와 "에이전트"가 모두 있으면 "Hermes " 세그먼트는 전자만,
 *   겹치는 "에이전트" 세그먼트는 둘 다 커버 → 클릭 시 해당 세그먼트를 덮는 **모든** 엔트리를 표시.
 * - 동음이의(같은 표기·다른 id)는 같은 스팬을 함께 덮어 여러 정의가 한 툴팁에 나열된다.
 * - 표기당 **첫 출현만**(클러터 방지). 매칭 없으면 원문 문자열 그대로 반환.
 * renderTerm(entries, surface, key) 는 그 스팬을 덮는 엔트리들로 TermTooltip 노드를 만든다.
 */
export function renderWithTerms(
  text: string,
  entries: GlossaryEntry[],
  renderTerm: (entriesAtSpan: GlossaryEntry[], surface: string, key: string) => ReactNode,
): ReactNode {
  if (!text || entries.length === 0) return text;

  // 1) 각 엔트리의 표기(ko/en) 첫 출현 → 인터벌.
  const intervals: Interval[] = [];
  for (const entry of entries) {
    for (const surface of [entry.termKo, entry.termEn]) {
      if (!surface) continue;
      const idx = text.indexOf(surface);
      if (idx < 0) continue;
      intervals.push({ start: idx, end: idx + surface.length, entry });
    }
  }
  if (intervals.length === 0) return text;

  // 2) 모든 경계를 컷포인트로 → 최소 세그먼트.
  const cuts = new Set<number>([0, text.length]);
  for (const iv of intervals) {
    cuts.add(iv.start);
    cuts.add(iv.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  // 3) 세그먼트별 커버 엔트리(id 중복 제거).
  type Seg = { start: number; end: number; entries: GlossaryEntry[]; ids: string };
  const segs: Seg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a >= b) continue;
    const covering: GlossaryEntry[] = [];
    const seen = new Set<string>();
    for (const iv of intervals) {
      if (iv.start <= a && iv.end >= b && !seen.has(iv.entry.id)) {
        seen.add(iv.entry.id);
        covering.push(iv.entry);
      }
    }
    segs.push({ start: a, end: b, entries: covering, ids: [...seen].sort().join('|') });
  }

  // 4) 동일 커버셋 인접 세그먼트 병합(연속 밑줄).
  const merged: Seg[] = [];
  for (const s of segs) {
    const last = merged[merged.length - 1];
    if (last && last.ids === s.ids) last.end = s.end;
    else merged.push({ ...s });
  }

  // 5) 렌더.
  const out: ReactNode[] = [];
  merged.forEach((s, i) => {
    const chunk = text.slice(s.start, s.end);
    if (s.entries.length === 0) out.push(chunk);
    else out.push(renderTerm(s.entries, chunk, `t${i}`));
  });
  return out;
}
