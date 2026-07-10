import type { LengthMode } from '@/lib/summary/format';

/**
 * get_feed_digests RPC 행 → 피드 카드(FeedItem) 매핑 + 하이브리드 프리로드 창 판정.
 * 페이지(초기 로드)와 서버 액션(일자 온디맨드)이 공유하는 단일 변환 지점.
 */

type ModeSummary = { coreText: string; bullets: string[] };

export interface FeedDigestRow {
  id: string;
  channel_id: string;
  title: string | null;
  url: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  summaries: unknown; // jsonb: { short|normal|long: { coreText, bullets } }
  pref_mode: string | null;
  bookmarked: boolean | null;
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
}

function parseSummaries(raw: unknown): Partial<Record<LengthMode, ModeSummary>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<LengthMode, ModeSummary>> = {};
  for (const [mode, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const rec = v as { coreText?: unknown; bullets?: unknown };
    out[mode as LengthMode] = {
      coreText: typeof rec.coreText === 'string' ? rec.coreText : '',
      bullets: Array.isArray(rec.bullets) ? (rec.bullets as string[]) : [],
    };
  }
  return out;
}

/** RPC 행 1개 → 카드. 요약이 비면 null(카드 성립 안 함). */
export function mapDigestRow(
  row: FeedDigestRow,
  channelById: Map<string, ChannelMeta>,
  globalMode: LengthMode,
  toKstDate: (iso: string) => string,
): MappedDigest | null {
  const summaries = parseSummaries(row.summaries);
  const modes = Object.keys(summaries) as LengthMode[];
  if (modes.length === 0) return null;

  const pref = (row.pref_mode ?? undefined) as LengthMode | undefined;
  const initialMode: LengthMode =
    pref && summaries[pref] ? pref : summaries[globalMode] ? globalMode : modes[0];

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
