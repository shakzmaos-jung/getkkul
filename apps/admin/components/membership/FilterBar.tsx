'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { membershipQueryString } from '@/lib/membership/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/** 멤버십 이력 필터/검색 바. status select 즉시 적용, 이메일 검색은 제출 시. URL searchParams 가 진실원. */
export function FilterBar({ status, search }: { status: string; search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextStatus: string, nextSearch: string) {
    router.push(
      `/membership${membershipQueryString({
        status: nextStatus || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(status, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select value={status} onChange={(e) => go(e.target.value, q)} aria-label="상태 필터" className={CTRL}>
        <option value="">전체 상태</option>
        <option value="success">결제 완료</option>
        <option value="proration">비례정산</option>
        <option value="skipped_free">PoC 무료</option>
        <option value="grace">유예</option>
        <option value="failed">실패</option>
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
      {(status || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/membership');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
