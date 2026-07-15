// 좋아요/싫어요 이벤트 타입 — get_feedback_events RPC 반환 형태. email 은 fetch 레이어에서 마스킹된 값.
export type FeedbackEventRow = {
  id: string;
  atKst: string;
  email: string; // 마스킹됨
  channelTitle: string | null;
  videoTitle: string;
  rating: 'up' | 'down';
  lengthMode: string;
  reason: string | null;
};

export type FeedbackEvents = {
  rows: FeedbackEventRow[];
  total: number;
};
