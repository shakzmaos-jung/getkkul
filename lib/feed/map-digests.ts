import { LENGTH_MODES, type LengthMode, type LongBody, type Sentence } from '@/lib/summary/format';

/**
 * get_feed_digests RPC 행 → 피드 카드(FeedItem) 매핑 + 하이브리드 프리로드 창 판정.
 * 페이지(초기 로드)와 서버 액션(일자 온디맨드)이 공유하는 단일 변환 지점.
 */

export type FeedbackRating = 'up' | 'down';

/** 카드 모드별 요약: 평면 coreText + (long) 2단락 body + 제공 안 함 상태(요약품질 REQ-A/C). */
export interface ModeSummary {
  coreText: string;
  long?: LongBody; // long 제공 시 2단락(핵심 사실 / 맥락·인사이트)
  notProvided?: boolean; // 콘텐츠 깊이 초과로 미제공(AC-C1.3)
}

export interface FeedDigestRow {
  id: string;
  channel_id: string;
  title: string | null;
  url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  summaries: unknown; // jsonb: { short|normal|long: { coreText, body } }
  pref_mode: string | null;
  bookmarked: boolean | null;
  feedback: unknown; // jsonb: { short|normal|long: 'up'|'down' } (본인 피드백)
}

export interface ChannelMeta {
  title: string;
  thumbnail: string | null;
  handle: string | null;
}

export interface MappedDigest {
  id: string;
  channelId: string;
  title: string;
  url: string;
  channelTitle: string;
  channelThumbnail: string | null;
  channelHandle: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  dateKst: string;
  initialMode: LengthMode;
  summaries: Partial<Record<LengthMode, ModeSummary>>;
  bookmarked: boolean;
  feedback: Partial<Record<LengthMode, FeedbackRating>>;
}

function toSentences(v: unknown): Sentence[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const o = (x ?? {}) as { text?: unknown; key?: unknown };
      return { text: typeof o.text === 'string' ? o.text : '', key: o.key === true };
    })
    .filter((s) => s.text.trim().length > 0);
}

function parseSummaries(raw: unknown): Partial<Record<LengthMode, ModeSummary>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<LengthMode, ModeSummary>> = {};
  for (const [mode, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const rec = v as { coreText?: unknown; body?: unknown };
    const body = (rec.body && typeof rec.body === 'object' ? rec.body : {}) as {
      facts?: unknown;
      insights?: unknown;
      notProvided?: unknown;
    };
    const facts = toSentences(body.facts);
    const insights = toSentences(body.insights);
    out[mode as LengthMode] = {
      coreText: typeof rec.coreText === 'string' ? rec.coreText : '',
      notProvided: body.notProvided === true,
      long: facts.length > 0 || insights.length > 0 ? { facts, insights } : undefined,
    };
  }
  return out;
}

function parseFeedback(raw: unknown): Partial<Record<LengthMode, FeedbackRating>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<LengthMode, FeedbackRating>> = {};
  for (const [mode, r] of Object.entries(raw as Record<string, unknown>)) {
    if (r === 'up' || r === 'down') out[mode as LengthMode] = r;
  }
  return out;
}

/** RPC 행 1개 → 카드. 제공되는 요약이 하나도 없으면 null(카드 성립 안 함). */
export function mapDigestRow(
  row: FeedDigestRow,
  channelById: Map<string, ChannelMeta>,
  globalMode: LengthMode,
  toKstDate: (iso: string) => string,
): MappedDigest | null {
  const summaries = parseSummaries(row.summaries);
  // 제공되는(미제공 아님) 모드만 초기 모드 후보 — 상위 미제공 모드에서 시작하지 않는다.
  const provided = (LENGTH_MODES as readonly LengthMode[]).filter(
    (m) => summaries[m] && !summaries[m]!.notProvided,
  );
  if (provided.length === 0) return null;

  const pref = (row.pref_mode ?? undefined) as LengthMode | undefined;
  const initialMode: LengthMode =
    pref && provided.includes(pref)
      ? pref
      : provided.includes(globalMode)
        ? globalMode
        : provided[0];

  const ch = channelById.get(row.channel_id);
  return {
    id: row.id,
    channelId: row.channel_id,
    title: row.title ?? '',
    url: row.url ?? '',
    channelTitle: ch?.title ?? '',
    channelThumbnail: ch?.thumbnail ?? null,
    channelHandle: ch?.handle ?? null,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    dateKst: row.published_at ? toKstDate(row.published_at) : '',
    initialMode,
    summaries,
    bookmarked: row.bookmarked === true,
    feedback: parseFeedback(row.feedback),
  };
}

/** 프리로드 창의 시작 KST 일자(YYYY-MM-DD). days=2 면 오늘 포함 2일(오늘·어제). */
export function preloadFromKstDate(todayKst: string, days: number): string {
  const [y, m, d] = todayKst.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - (days - 1));
  return dt.toISOString().slice(0, 10);
}

/** 선택 일자가 프리로드 창 안인가(문자열 비교 — YYYY-MM-DD 는 사전순=시간순). */
export function isPreloadedDate(dateKst: string, preloadFrom: string): boolean {
  return dateKst >= preloadFrom;
}
