'use client';

import { useMemo, useState } from 'react';
import DigestCalendar from '@/components/feed/DigestCalendar';
import SummaryCard from '@/components/feed/SummaryCard';
import ChannelFilter from '@/components/feed/ChannelFilter';
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
};

/**
 * 캘린더(일자) + 채널 멀티체크로 다이제스트를 필터링. default 는 오늘·전체 채널.
 * 채널 선택이 바뀌면 캘린더 일자별 수도 선택 채널 기준으로 재집계된다.
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
  const [selected, setSelected] = useState(() => initialDate ?? todayKst);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(channels.map((c) => c.id)));

  // 선택 채널 기준 일자별 다이제스트 수 재집계
  const countsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { c, d } of digestDates) {
      if (!checked.has(c)) continue;
      m[d] = (m[d] ?? 0) + 1;
    }
    return m;
  }, [digestDates, checked]);

  const filtered = items.filter((it) => it.dateKst === selected && checked.has(it.channelId));

  return (
    <>
      <div className="mb-3">
        <ChannelFilter channels={channels} checked={checked} onChange={setChecked} />
      </div>

      <div className="mb-6">
        <DigestCalendar
          todayKst={todayKst}
          selected={selected}
          onSelect={setSelected}
          countsByDate={countsByDate}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">이 조건의 다이제스트가 없습니다.</p>
        </div>
      ) : (
        <div data-testid="feed-list" className="flex flex-col gap-4">
          {filtered.map((it) => (
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
            />
          ))}
        </div>
      )}
    </>
  );
}
