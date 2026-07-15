'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { feedbackQueryString } from '@/lib/feedback/derive';

const CTRL =
  'rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink outline-none focus:border-ink-subtle';

/**
 * 피드백 이력 필터/검색 바(어드민 최초 인터랙션). 상태를 URL searchParams 로 반영 →
 * 서버 컴포넌트가 재조회(requireAdmin·service_role 은 서버에만). 반응 select 는 즉시 적용,
 * 검색어는 제출(Enter/검색) 시 적용. rating 은 URL 이 진실원(controlled).
 */
export function FilterBar({ rating, search }: { rating: string; search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function go(nextRating: string, nextSearch: string) {
    router.push(
      `/feedback${feedbackQueryString({
        rating: nextRating || undefined,
        search: nextSearch.trim() || undefined,
      })}`,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(rating, q);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <select
        value={rating}
        onChange={(e) => go(e.target.value, q)}
        aria-label="반응 필터"
        className={CTRL}
      >
        <option value="">전체 반응</option>
        <option value="up">👍 좋아요</option>
        <option value="down">👎 싫어요</option>
      </select>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="영상 · 채널 · 이메일 · 사유 검색"
        aria-label="검색어"
        className={`${CTRL} min-w-56 flex-1`}
      />
      <button
        type="submit"
        className="rounded-lg border border-hairline bg-surface-1 px-3 py-1.5 text-sm text-ink-subtle hover:text-ink"
      >
        검색
      </button>
      {(rating || q) && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/feedback');
          }}
          className="rounded-lg px-2 py-1.5 text-sm text-ink-tertiary hover:text-ink"
        >
          초기화
        </button>
      )}
    </form>
  );
}
