'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendQueryString } from '@/lib/send-history/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/** 발송 이력 필터(슬롯·상태) + 이메일 검색 바. 상태를 URL searchParams 로 반영(feedback FilterBar 패턴). */
export function FilterBar({ slot, status, search }: { slot: string; status: string; search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextSlot: string, nextStatus: string, nextSearch: string) {
    router.push(
      `/send-history${sendQueryString({
        slot: nextSlot || undefined,
        status: nextStatus || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(slot, status, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select value={slot} onChange={(e) => go(e.target.value, status, q)} aria-label="슬롯 필터" className={CTRL}>
        <option value="">전체 슬롯</option>
        <option value="0730">07:30</option>
        <option value="1130">11:30</option>
        <option value="1730">17:30</option>
        <option value="2130">21:30</option>
      </select>
      <select value={status} onChange={(e) => go(slot, e.target.value, q)} aria-label="상태 필터" className={CTRL}>
        <option value="">전체 상태</option>
        <option value="sent">발송</option>
        <option value="failed">실패</option>
        <option value="empty">빈 발송</option>
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이메일 검색"
        aria-label="검색어"
        className={`${CTRL} min-w-56 flex-1`}
      />
      <button
        type="submit"
        className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        검색
      </button>
      {(slot || status || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/send-history');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
