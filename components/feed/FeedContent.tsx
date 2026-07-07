'use client';

import { useMemo, useState, useTransition } from 'react';
import DigestCalendar from '@/components/feed/DigestCalendar';
import SummaryCard from '@/components/feed/SummaryCard';
import ChannelFilter from '@/components/feed/ChannelFilter';
import { TabCards } from '@/components/ui/TabCards';
import { toggleBookmark } from '@/app/feed/actions';
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
 */
export default function FeedContent({
  items,
  channels,
  digestDates,
  todayKst,
  initialDate,
}: {
  items: FeedItem[];
  channels: FeedChannel[];
  digestDates: { c: string; d: string }[];
  todayKst: string;
  initialDate?: string;
}) {
  const [tab, setTab] = useState<Tab>('digest');
  const [selected, setSelected] = useState(() => initialDate ?? todayKst);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(channels.map((c) => c.id)));
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.bookmarked).map((i) => i.id)),
  );
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

  // 선택 채널 기준 일자별 다이제스트 수 재집계
  const countsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { c, d } of digestDates) {
      if (!checked.has(c)) continue;
      m[d] = (m[d] ?? 0) + 1;
    }
    return m;
  }, [digestDates, checked]);

  const list =
    tab === 'digest'
      ? items.filter((it) => it.dateKst === selected && checked.has(it.channelId))
      : items.filter((it) => bookmarks.has(it.id) && checked.has(it.channelId));

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

      {tab === 'digest' && (
        <div className="mb-3">
          <DigestCalendar
            todayKst={todayKst}
            selected={selected}
            onSelect={setSelected}
            countsByDate={countsByDate}
          />
        </div>
      )}

      {/* 채널 필터: 캘린더 아래 배치 */}
      <div className="mb-6">
        <ChannelFilter channels={channels} checked={checked} onChange={setChecked} />
      </div>

      {list.length === 0 ? (
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
