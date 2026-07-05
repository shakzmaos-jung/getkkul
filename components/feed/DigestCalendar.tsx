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
 * 년/월 좌우 버튼·클릭 이동, 스트립은 터치 스와이프 + 좌우 버튼 페이징(다음 페이지 연속).
 * default 년/월·일자는 오늘(KST, todayKst).
 */
export default function DigestCalendar({
  todayKst,
  countsByDate,
}: {
  todayKst: string;
  countsByDate: Record<string, number>;
}) {
  const [ty, tm] = todayKst.split('-').map(Number);
  const [viewYear, setViewYear] = useState(ty);
  const [viewMonth, setViewMonth] = useState(tm);
  const [selected, setSelected] = useState(todayKst);
  const [pickerOpen, setPickerOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLButtonElement>(null);

  const days = useMemo(() => {
    const n = daysInMonth(viewYear, viewMonth);
    return Array.from({ length: n }, (_, i) => {
      const day = i + 1;
      const dateStr = ymd(viewYear, viewMonth, day);
      const wd = new Date(viewYear, viewMonth - 1, day).getDay();
      return { day, dateStr, wd, weekday: WEEKDAYS[wd], count: countsByDate[dateStr] ?? 0 };
    });
  }, [viewYear, viewMonth, countsByDate]);

  // 오늘 월을 보면 오늘 셀로 스크롤, 아니면 처음으로
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    if (viewYear === ty && viewMonth === tm && todayCellRef.current) {
      todayCellRef.current.scrollIntoView({ inline: 'center', block: 'nearest' });
    } else {
      el.scrollTo({ left: 0 });
    }
  }, [viewYear, viewMonth, ty, tm]);

  function prevMonth() {
    setPickerOpen(false);
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    setPickerOpen(false);
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
  }
  function pageStrip(dir: number) {
    const el = stripRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  }

  const weekendColor = (wd: number, active: boolean) =>
    active ? '' : wd === 0 ? 'text-red-500' : wd === 6 ? 'text-blue-500' : '';

  return (
    <Card className="p-4">
      {/* 년/월 네비 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="이전 달"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          data-testid="calendar-title"
          className="rounded-lg px-3 py-1 text-sm font-semibold transition-colors hover:bg-muted"
        >
          {viewYear}.{viewMonth}월
        </button>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="다음 달"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="right" />
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
      <div className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => pageStrip(-1)}
          aria-label="이전 날짜"
          className="inline-flex h-8 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="left" />
        </button>

        <div
          ref={stripRef}
          data-testid="calendar-strip"
          className="flex snap-x scroll-smooth gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((d) => {
            const isToday = d.dateStr === todayKst;
            const isSelected = d.dateStr === selected;
            return (
              <button
                key={d.dateStr}
                type="button"
                ref={isToday ? todayCellRef : undefined}
                onClick={() => setSelected(d.dateStr)}
                data-testid={isToday ? 'calendar-today' : undefined}
                className={`flex w-12 shrink-0 snap-start flex-col items-center gap-0.5 rounded-lg py-2 transition-colors ${
                  isSelected ? 'bg-foreground text-background' : 'hover:bg-muted'
                } ${isToday && !isSelected ? 'ring-1 ring-inset ring-accent' : ''}`}
              >
                <span className={`text-[10px] ${weekendColor(d.wd, isSelected)}`}>{d.weekday}</span>
                <span className={`text-sm font-semibold ${weekendColor(d.wd, isSelected)}`}>{d.day}</span>
                <span
                  className={`text-[11px] font-medium ${
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
          className="inline-flex h-8 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Chevron dir="right" />
        </button>
      </div>
    </Card>
  );
}
