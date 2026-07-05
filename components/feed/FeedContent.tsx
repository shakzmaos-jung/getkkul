'use client';

import { useState } from 'react';
import DigestCalendar from '@/components/feed/DigestCalendar';
import SummaryCard from '@/components/feed/SummaryCard';
import type { LengthMode } from '@/lib/summary/format';

type ModeSummary = { coreText: string; bullets: string[] };

export type FeedItem = {
  id: string;
  title: string;
  url: string;
  channelTitle: string;
  publishedAt: string | null;
  dateKst: string;
  initialMode: LengthMode;
  summaries: Partial<Record<LengthMode, ModeSummary>>;
};

/** 캘린더 선택 일자로 다이제스트를 필터링해 보여준다. default 는 오늘(todayKst). */
export default function FeedContent({
  items,
  todayKst,
  countsByDate,
}: {
  items: FeedItem[];
  todayKst: string;
  countsByDate: Record<string, number>;
}) {
  const [selected, setSelected] = useState(todayKst);
  const filtered = items.filter((it) => it.dateKst === selected);

  return (
    <>
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
          <p className="text-sm text-muted-foreground">이 날짜의 다이제스트가 없습니다.</p>
        </div>
      ) : (
        <div data-testid="feed-list" className="flex flex-col gap-4">
          {filtered.map((it) => (
            <SummaryCard
              key={it.id}
              videoId={it.id}
              channelTitle={it.channelTitle}
              title={it.title}
              url={it.url}
              publishedAt={it.publishedAt}
              initialMode={it.initialMode}
              summaries={it.summaries}
            />
          ))}
        </div>
      )}
    </>
  );
}
