'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { versionQueryString } from '@/lib/versions/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/** 버전 히스토리 타입 필터 + 검색 바. 상태를 URL searchParams 로 반영해 서버가 필터링(feedback FilterBar 패턴). */
export function FilterBar({ type, search }: { type: string; search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextType: string, nextSearch: string) {
    router.push(
      `/versions${versionQueryString({
        type: nextType || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(type, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select value={type} onChange={(e) => go(e.target.value, q)} aria-label="타입 필터" className={CTRL}>
        <option value="">전체 타입</option>
        <option value="minor">MINOR</option>
        <option value="patch">PATCH</option>
        <option value="major">MAJOR</option>
        <option value="baseline">BASELINE</option>
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="버전 · 요약 · 설명 검색"
        aria-label="검색어"
        className={`${CTRL} min-w-56 flex-1`}
      />
      <button
        type="submit"
        className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        검색
      </button>
      {(type || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/versions');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
