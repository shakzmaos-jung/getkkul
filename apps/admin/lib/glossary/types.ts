// 용어사전 타입 v2 — id PK · 한글/영어 분리 · 동음이의(homonymCount) · 일시정지 · 메모.
export type GlossaryRow = {
  id: string;
  termKo: string | null;
  termEn: string | null;
  definition: string | null;
  note: string | null; // 관리자 메모(이력 없음)
  aliases: string[]; // 다른 표기(매칭 전용, 툴팁은 대표명)
  source: string; // 'llm' | 'admin'
  disabled: boolean; // 일시 사용정지
  editorEmail: string | null; // 마스킹
  editCount: number;
  homonymCount: number; // 같은 이름의 다른 행 수
  updatedAtKst: string;
};

export type Glossary = { rows: GlossaryRow[]; total: number };

/** 이력 스냅샷(before/after). action 에 따라 채워지는 필드가 다르다. */
export type GlossarySnapshot = {
  term_ko?: string | null;
  term_en?: string | null;
  definition?: string | null;
  source?: string | null;
  disabled?: boolean | null;
};

export type GlossaryHistoryRow = {
  id: string;
  action: string; // 'create' | 'edit' | 'disable' | 'enable' | 'delete'
  before: GlossarySnapshot | null;
  after: GlossarySnapshot | null;
  editorEmail: string | null; // 마스킹
  editedAtKst: string;
};
