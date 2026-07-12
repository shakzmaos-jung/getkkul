'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate(); // m: 1-based → 해당 월의 마지막 일
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

/**
 * 다이제스트 캘린더 — 가로 날짜 스트립(요일·일자·다이제스트 수).
 * 년/월은 타이틀 클릭 → 선택 패널(월 이동 버튼 없음). 스트립은 스와이프 + 좌우 버튼 페이징.
 * 컨트롤드: selected/onSelect 로 피드 필터링과 연동. default 는 오늘(todayKst).
 */
export default function DigestCalendar({
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
  const [sy0, sm0] = selected.split('-').map(Number);
  const [viewYear, setViewYear] = useState(sy0);
  const [viewMonth, setViewMonth] = useState(sm0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const selectedCellRef = useRef<HTMLButtonElement>(null);

  const days = useMemo(() => {
    const n = daysInMonth(viewYear, viewMonth);
    return Array.from({ length: n }, (_, i) => {
      const day = i + 1;
      const dateStr = ymd(viewYear, viewMonth, day);
      const wd = new Date(viewYear, viewMonth - 1, day).getDay();
      return { day, dateStr, wd, weekday: WEEKDAYS[wd], count: countsByDate[dateStr] ?? 0 };
    });
  }, [viewYear, viewMonth, countsByDate]);

  // 선택 일자가 보는 월에 있으면 그 셀로 스크롤, 아니면 처음으로
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const [sy, sm] = selected.split('-').map(Number);
    if (sy === viewYear && sm === viewMonth && selectedCellRef.current) {
      selectedCellRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
    } else {
      el.scrollTo({ left: 0 });
    }
  }, [viewYear, viewMonth, selected]);

  function pageStrip(dir: number) {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  }

  const weekendColor = (wd: number, active: boolean) =>
    active ? '' : wd === 0 ? 'text-red-500' : wd === 6 ? 'text-blue-500' : '';

  return (
    <Card className="p-3">
      {/* 년/월 (클릭 → 선택 패널) */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          data-testid="calendar-title"
          className="rounded-lg px-3 py-1 text-sm font-semibold transition-colors hover:bg-muted"
        >
          {viewYear}.{viewMonth}월
        </button>
      </div>

      {/* 년/월 선택 패널 */}
      {pickerOpen && (
        <div className="mt-2 rounded-lg border border-border bg-background p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="이전 해"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Chevron dir="left" />
            </button>
            <span className="text-sm font-medium">{viewYear}년</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              aria-label="다음 해"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Chevron dir="right" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setViewMonth(m);
                  setPickerOpen(false);
                }}
                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                  m === viewMonth
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 날짜 스트립 */}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => pageStrip(-1)}
          aria-label="이전 날짜"
          className="inline-flex h-9 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="left" />
        </button>

        <div
          ref={stripRef}
          data-testid="calendar-strip"
          className="flex snap-x scroll-smooth gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((d) => {
            const isSelected = d.dateStr === selected;
            return (
              <button
                key={d.dateStr}
                type="button"
                ref={isSelected ? selectedCellRef : undefined}
                onClick={() => onSelect(d.dateStr)}
                data-testid={d.dateStr === todayKst ? 'calendar-today' : undefined}
                className={`flex w-11 shrink-0 snap-start flex-col items-center rounded-lg py-1.5 transition-colors ${
                  isSelected ? 'bg-foreground text-background' : 'hover:bg-muted'
                }`}
              >
                <span className={`text-[10px] leading-tight ${weekendColor(d.wd, isSelected)}`}>
                  {d.weekday}
                </span>
                <span
                  className={`text-sm font-semibold leading-tight ${weekendColor(d.wd, isSelected)}`}
                >
                  {d.day}
                </span>
                <span
                  className={`text-[10px] leading-tight ${
                    isSelected
                      ? 'text-background/90'
                      : d.count > 0
                        ? 'text-accent'
                        : 'text-muted-foreground/40'
                  }`}
                >
                  {d.count > 0 ? d.count : '·'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => pageStrip(1)}
          aria-label="다음 날짜"
          className="inline-flex h-9 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </Card>
  );
}
