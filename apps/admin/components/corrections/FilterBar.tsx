'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { correctionQueryString } from '@/lib/corrections/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/** 교정 로그 필터(방식·표기형) + 원문/교정/영상제목 검색 바. 상태를 URL searchParams 로 반영. */
export function FilterBar({
  method,
  form,
  search,
}: {
  method: string;
  form: string;
  search: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextMethod: string, nextForm: string, nextSearch: string) {
    router.push(
      `/corrections${correctionQueryString({
        method: nextMethod || undefined,
        form: nextForm || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(method, form, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select
        value={method}
        onChange={(e) => go(e.target.value, form, q)}
        aria-label="방식 필터"
        className={CTRL}
      >
        <option value="">전체 방식</option>
        <option value="llm">자동(LLM)</option>
        <option value="admin">관리자 수정</option>
      </select>
      <select
        value={form}
        onChange={(e) => go(method, e.target.value, q)}
        aria-label="표기형 필터"
        className={CTRL}
      >
        <option value="">전체 표기형</option>
        <option value="ko">한글</option>
        <option value="en">영어</option>
        <option value="hybrid">하이브리드</option>
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="원문 · 교정 · 영상제목 검색"
        aria-label="검색어"
        className={`${CTRL} min-w-56 flex-1`}
      />
      <button
        type="submit"
        className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        검색
      </button>
      {(method || form || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/corrections');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
