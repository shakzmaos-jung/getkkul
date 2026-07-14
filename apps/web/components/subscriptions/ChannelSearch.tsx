'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchChannels, addSubscriptionById, type SearchCandidate } from '@/app/subscriptions/actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { useToast } from '@/components/ui/ToastProvider';

const MIN_CHARS = 2; // AC-C1.2

/** 구독자 수 한국어 축약(만/억). 없으면 null. */
function formatSubs(n: number | null | undefined): string | null {
  if (n == null) return null;
  const fix = (v: number) => v.toFixed(1).replace(/\.0$/, '');
  if (n >= 100_000_000) return `구독자 ${fix(n / 100_000_000)}억명`;
  if (n >= 10_000) return `구독자 ${fix(n / 10_000)}만명`;
  if (n >= 1_000) return `구독자 ${fix(n / 1_000)}천명`;
  return `구독자 ${n.toLocaleString('ko-KR')}명`;
}

/**
 * 채널 제목 검색 → 후보 선택 저장 (channel-search REQ-A). "검색하기" 버튼(또는 Enter)으로만 검색 시작해
 * 불필요한 API 호출을 억제(REQ-C). 후보에 핸들·구독자 수 표시. 이미 구독 중이면 "구독됨".
 */
export default function ChannelSearch() {
  const router = useRouter();
  const showToast = useToast();
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [capped, setCapped] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const reqId = useRef(0);

  const canSearch = query.trim().length >= MIN_CHARS && !searching;

  async function runSearch() {
    const q = query.trim();
    if (q.length < MIN_CHARS || searching) return;
    setSearching(true);
    const my = ++reqId.current;
    try {
      const r = await searchChannels(q);
      if (my !== reqId.current) return; // 최신 요청만 반영
      setCandidates(r.candidates);
      setCapped(r.capped);
      setSearched(true);
    } catch {
      if (my === reqId.current) {
        setCandidates([]);
        setSearched(true);
      }
    } finally {
      if (my === reqId.current) setSearching(false);
    }
  }

  /** 검색 결과 목록 닫기(채널을 고르지 않아도 닫을 수 있는 UX). 입력어는 유지해 재검색 가능. */
  function dismiss() {
    setCandidates([]);
    setCapped(false);
    setSearched(false);
  }

  async function add(c: SearchCandidate) {
    if (adding) return;
    setAdding(c.channelId);
    const r = await addSubscriptionById(c.channelId);
    setAdding(null);
    if (r.ok) {
      showToast('채널 등록이 완료되었습니다');
      dismiss(); // 등록 완료 시 검색 결과 목록 자동 닫기
      router.refresh();
    } else if (r.already) {
      showToast('이미 등록된 채널입니다');
      setCandidates((prev) =>
        prev.map((x) => (x.channelId === c.channelId ? { ...x, subscribed: true } : x)),
      );
    } else {
      showToast(r.error ?? '추가에 실패했습니다');
    }
  }

  const showEmpty = searched && !searching && candidates.length === 0 && !capped;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="채널 이름으로 검색 (예: 슈카월드)"
          className="flex-1"
          data-testid="channel-search"
          aria-label="채널 검색"
        />
        <Button
          type="button"
          variant="primary"
          onClick={runSearch}
          disabled={!canSearch}
          className="shrink-0"
          data-testid="channel-search-submit"
        >
          {searching ? <Spinner size={14} /> : '검색하기'}
        </Button>
      </div>

      {capped && (
        <p className="text-xs text-muted-foreground">
          오늘 검색 한도에 도달했어요. 아래에서 URL·핸들로 직접 추가할 수 있어요.
        </p>
      )}

      {candidates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* 목록 헤더: 결과 수 + 닫기(채널을 고르지 않아도 목록 닫기) */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs text-muted-foreground">
              검색 결과 {candidates.length}
              {capped ? '+' : ''}개
            </span>
            <button
              type="button"
              onClick={dismiss}
              data-testid="channel-candidates-close"
              aria-label="검색 결과 닫기"
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              닫기 ✕
            </button>
          </div>
          <ul
            data-testid="channel-candidates"
            className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
          >
            {candidates.map((c) => {
              const subs = formatSubs(c.subscriberHint);
              const meta = [c.handle, subs].filter(Boolean).join(' · ');
              return (
                <li key={c.channelId} className="flex items-center gap-3 px-3 py-2">
                  <ChannelAvatar src={c.thumbnail} title={c.title} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
                  </div>
                  {c.subscribed ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => showToast('이미 등록된 채널입니다')}
                      data-testid="candidate-subscribed"
                      className="shrink-0"
                    >
                      구독됨
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={adding === c.channelId}
                      onClick={() => add(c)}
                      data-testid="candidate-add"
                    >
                      {adding === c.channelId ? <Spinner size={12} /> : '추가'}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showEmpty && (
        <p className="text-xs text-muted-foreground">
          검색 결과가 없어요. 아래에서 URL·핸들로 직접 추가해 보세요.
        </p>
      )}
    </div>
  );
}
