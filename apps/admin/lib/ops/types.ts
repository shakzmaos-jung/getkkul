// 운영 데이터 타입 — get_ops_data RPC 반환 형태. email 은 fetch 레이어에서 마스킹된 값.
export type Subscriber = {
  email: string; // 마스킹됨
  signupAt: string;
  activeSubs: number;
  membership: string | null;
};
export type DigestRow = {
  email: string; // 마스킹됨
  title: string;
  slot: string;
  channel: string;
  status: string;
  atKst: string;
};
export type OpsData = {
  subscribers: Subscriber[];
  recentDigests: DigestRow[];
};
