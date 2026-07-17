'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { glossaryQueryString } from '@/lib/glossary/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/** 용어사전 필터/검색 바. source·status select 즉시 적용, 검색어는 제출 시. URL searchParams 가 진실원. */
export function FilterBar({ source, status, search }: { source: string; status: string; search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextSource: string, nextStatus: string, nextSearch: string) {
    router.push(
      `/glossary${glossaryQueryString({
        source: nextSource || undefined,
        status: nextStatus || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(source, status, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select value={source} onChange={(e) => go(e.target.value, status, q)} aria-label="출처 필터" className={CTRL}>
        <option value="">전체 출처</option>
        <option value="llm">LLM</option>
        <option value="admin">관리자</option>
      </select>
      <select value={status} onChange={(e) => go(source, e.target.value, q)} aria-label="상태 필터" className={CTRL}>
        <option value="">전체 상태</option>
        <option value="active">사용중</option>
        <option value="disabled">일시정지</option>
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="용어 · 정의 검색"
        aria-label="검색어"
        className={`${CTRL} min-w-56 flex-1`}
      />
      <button
        type="submit"
        className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        검색
      </button>
      {(source || status || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/glossary');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
