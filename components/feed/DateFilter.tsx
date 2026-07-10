'use client';

import { useState } from 'react';
import DigestCalendar from '@/components/feed/DigestCalendar';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 선택일 라벨: 오늘이면 '오늘', 아니면 'M/D (요일)'. */
function label(selected: string, todayKst: string): string {
  if (selected === todayKst) return '오늘';
  const [y, m, d] = selected.split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}/${d} (${wd})`;
}

/**
 * 컴팩트 날짜 필터 — 트리거 버튼(선택일 표시) + 팝오버(기존 DigestCalendar 재사용).
 * 큰 캘린더 스트립을 접어 상단을 한 줄로 만든다. 날짜 선택 시 닫힌다.
 */
export default function DateFilter({
  todayKst,
  selected,
  onSelect,
  countsByDate,
}: {
  todayKst: string;
  selected: string;
  onSelect: (date: string) => void;
  countsByDate: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="date-filter"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="text-muted-foreground"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="font-medium">날짜</span>
        <span className="text-muted-foreground">· {label(selected, todayKst)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted-foreground">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-40 mt-1 w-[20rem] max-w-[calc(100vw-2rem)] shadow-lg">
            <DigestCalendar
              todayKst={todayKst}
              selected={selected}
              countsByDate={countsByDate}
              onSelect={(d) => {
                onSelect(d);
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
