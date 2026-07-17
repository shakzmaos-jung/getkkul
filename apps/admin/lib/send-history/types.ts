// 발송 이력 타입 — get_send_history RPC 반환. email 은 fetch 레이어에서 마스킹된 값.
export type SendEventRow = {
  id: string;
  atKst: string;
  email: string; // 마스킹됨
  slot: string; // '0730'|'1130'|'1730'|'2130'
  itemCount: number;
  emailStatus: string | null; // 'sent'|'failed'|'skipped'|null
  pushStatus: string | null;
  error: string | null;
};

export type SendHistory = {
  rows: SendEventRow[];
  total: number;
};
