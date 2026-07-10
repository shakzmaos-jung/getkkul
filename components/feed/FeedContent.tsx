'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import DateFilter from '@/components/feed/DateFilter';
import SummaryCard from '@/components/feed/SummaryCard';
import ChannelFilter from '@/components/feed/ChannelFilter';
import { TabCards } from '@/components/ui/TabCards';
import { Spinner } from '@/components/ui/Spinner';
import { toggleBookmark, fetchDigestsForDate } from '@/app/feed/actions';
import { isPreloadedDate } from '@/lib/feed/map-digests';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

export type FeedChannel = { id: string; title: string; thumbnail: string | null };

export type FeedItem = {
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
};

type Tab = 'digest' | 'bookmark';

/**
 * 상단 탭(다이제스트/북마크) + 캘린더(일자) + 채널 멀티체크로 다이제스트를 필터링.
 * - 다이제스트 탭: 캘린더 선택일 + 채널 필터. (채널 필터는 캘린더 아래)
 * - 북마크 탭: 북마크된 항목만(채널 필터 적용, 일자 무관).
 * 하이브리드 로딩: 프리로드 창(preloadFrom 이후) 날짜는 즉시, 그 이전 날짜는
 * 선택 시 서버 액션으로 온디맨드 조회 후 클라이언트 캐시(재방문 즉시).
 */
export default function FeedContent({
  items,
  bookmarkedItems,
  channels,
  digestDates,
  todayKst,
  initialDate,
  preloadFrom,
}: {
  items: FeedItem[];
  bookmarkedItems: FeedItem[];
  channels: FeedChannel[];
  digestDates: { c: string; d: string; n: number }[];
  todayKst: string;
  initialDate?: string;
  preloadFrom: string;
}) {
  const [tab, setTab] = useState<Tab>('digest');
  const [selected, setSelected] = useState(() => initialDate ?? todayKst);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(channels.map((c) => c.id)));
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () =>
      new Set(
        [...items, ...bookmarkedItems].filter((i) => i.bookmarked).map((i) => i.id),
      ),
  );
  // 프리로드 창 밖 날짜의 온디맨드 캐시(date → items). 미존재 = 미조회(또는 조회 중).
  const [extraByDate, setExtraByDate] = useState<Record<string, FeedItem[]>>({});
  const inflight = useRef<Set<string>>(new Set()); // 중복 조회 방지
  const [, startTransition] = useTransition();

  function onToggleBookmark(id: string, next: boolean) {
    setBookmarks((prev) => {
      const n = new Set(prev);
      if (next) n.add(id);
      else n.delete(id);
      return n;
    });
    startTransition(() => {
      void toggleBookmark(id, next);
    });
  }

  // 프리로드 창 밖 + 미캐시 날짜의 카드를 서버에서 조회(하이브리드). 결과는 캐시.
  function ensureDateLoaded(date: string) {
    if (isPreloadedDate(date, preloadFrom)) return;
    if (extraByDate[date] !== undefined || inflight.current.has(date)) return;
    inflight.current.add(date);
    void fetchDigestsForDate(date).then((r) => {
      inflight.current.delete(date);
      const fetched = 'items' in r ? r.items : [];
      setExtraByDate((prev) => ({ ...prev, [date]: fetched }));
      if (fetched.some((it) => it.bookmarked)) {
        // 온디맨드 항목의 북마크 상태를 병합(북마크 탭·아이콘 일관성).
        setBookmarks((prev) => {
          const n = new Set(prev);
          for (const it of fetched) if (it.bookmarked) n.add(it.id);
          return n;
        });
      }
    });
  }

  function onSelectDate(date: string) {
    setSelected(date);
    ensureDateLoaded(date);
  }

  // ?date= 딥링크가 프리로드 창 밖이면 최초 렌더 시에도 조회.
  useEffect(() => {
    ensureDateLoaded(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선택 채널 기준 일자별 다이제스트 수 재집계(경량 집계 RPC 의 (채널,일자,수) 사용)
  const countsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { c, d, n } of digestDates) {
      if (!checked.has(c)) continue;
      m[d] = (m[d] ?? 0) + n;
    }
    return m;
  }, [digestDates, checked]);

  const selectedPreloaded = isPreloadedDate(selected, preloadFrom);
  const dateLoading = !selectedPreloaded && extraByDate[selected] === undefined;
  const digestSource = selectedPreloaded ? items : (extraByDate[selected] ?? []);

  // 북마크 탭 소스: 전용 RPC 결과(창 밖 포함) ∪ 방금 창/온디맨드에서 북마크한 항목(중복 제거).
  const bookmarkList = useMemo(() => {
    const byId = new Map<string, FeedItem>();
    for (const it of bookmarkedItems) byId.set(it.id, it);
    for (const it of [...items, ...Object.values(extraByDate).flat()]) {
      if (bookmarks.has(it.id)) byId.set(it.id, it);
    }
    return [...byId.values()]
      .filter((it) => bookmarks.has(it.id) && checked.has(it.channelId))
      .sort((a, b) => (a.publishedAt && b.publishedAt ? (a.publishedAt < b.publishedAt ? 1 : -1) : 0));
  }, [bookmarkedItems, items, extraByDate, bookmarks, checked]);

  const list =
    tab === 'digest'
      ? digestSource.filter((it) => it.dateKst === selected && checked.has(it.channelId))
      : bookmarkList;

  return (
    <>
      <TabCards
        ariaLabel="다이제스트 / 북마크"
        className="mb-4"
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'digest', title: '다이제스트' },
          { key: 'bookmark', title: '북마크', count: bookmarks.size },
        ]}
      />

      {/* 상단 컨트롤 한 줄: 날짜 필터 + 바로 우측에 채널 필터 인접 */}
      <div className="mb-6 flex items-center gap-2">
        {tab === 'digest' && (
          <DateFilter
            todayKst={todayKst}
            selected={selected}
            onSelect={onSelectDate}
            countsByDate={countsByDate}
          />
        )}
        <ChannelFilter channels={channels} checked={checked} onChange={setChecked} />
      </div>

      {dateLoading && tab === 'digest' ? (
        <div
          data-testid="date-loading"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12"
        >
          <Spinner />
          <span className="text-sm text-muted-foreground">이 날짜의 다이제스트를 불러오는 중…</span>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === 'bookmark' ? '북마크한 다이제스트가 없습니다.' : '이 조건의 다이제스트가 없습니다.'}
          </p>
        </div>
      ) : (
        <div data-testid="feed-list" className="flex flex-col gap-4">
          {list.map((it) => (
            <SummaryCard
              key={it.id}
              videoId={it.id}
              channelTitle={it.channelTitle}
              channelThumbnail={it.channelThumbnail}
              channelHandle={it.channelHandle}
              title={it.title}
              url={it.url}
              publishedAt={it.publishedAt}
              durationSeconds={it.durationSeconds}
              initialMode={it.initialMode}
              summaries={it.summaries}
              bookmarked={bookmarks.has(it.id)}
              onToggleBookmark={(next) => onToggleBookmark(it.id, next)}
            />
          ))}
        </div>
      )}
    </>
  );
}
