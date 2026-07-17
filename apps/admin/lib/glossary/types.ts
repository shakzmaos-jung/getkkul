// 용어사전 타입 — get_glossary / get_glossary_history RPC 반환. editorEmail 은 fetch 레이어에서 마스킹.
export type GlossaryRow = {
  term: string;
  definition: string | null;
  source: string; // 'llm' | 'admin'
  editorEmail: string | null; // 마스킹
  editCount: number;
  updatedAtKst: string;
};

export type Glossary = { rows: GlossaryRow[]; total: number };

export type GlossaryHistoryRow = {
  id: string;
  oldDefinition: string | null;
  newDefinition: string | null;
  oldSource: string | null;
  newSource: string;
  editorEmail: string | null; // 마스킹
  editedAtKst: string;
};
