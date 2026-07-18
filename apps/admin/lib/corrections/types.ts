// 오타(용어) 교정 로그 타입 — get_term_corrections RPC 반환.
export type CorrectionForm = 'ko' | 'en' | 'hybrid';
export type CorrectionMethod = 'llm' | 'admin';

export type CorrectionRow = {
  id: string;
  atKst: string;
  videoId: string;
  videoTitle: string | null;
  channelTitle: string | null;
  original: string;
  corrected: string;
  form: CorrectionForm;
  method: CorrectionMethod;
  reason: string | null;
  adminMemo: string | null;
  updatedAtKst: string | null;
};

export type CorrectionLog = {
  rows: CorrectionRow[];
  total: number;
};
