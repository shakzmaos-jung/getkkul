'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchChannels, addSubscriptionById, type SearchCandidate } from '@/app/subscriptions/actions';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { useToast } from '@/components/ui/ToastProvider';

const DEBOUNCE_MS = 400; // AC-C1.1
const MIN_CHARS = 2; // AC-C1.2

/**
 * 채널 제목 검색 → 후보 선택 저장 (channel-search REQ-A). 디바운스·최소 글자수로 API 억제(REQ-C).
 * 이미 구독 중이면 "구독됨" 표시(중복 저장 안 함). 상한 도달 시 안내 + 직접 입력 유도.
 */
export default function ChannelSearch() {
  const router = useRouter();
  const showToast = useToast();
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [capped, setCapped] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const reqId = useRef(0);

  // 즉시 상태 갱신은 이벤트 핸들러에서(effect 내 동기 setState 회피). 최소 글자수 미달이면 결과를 비운다.
  function onChange(v: string) {
    setQuery(v);
    const q = v.trim();
    if (q.length < MIN_CHARS) {
      setCandidates([]);
      setCapped(false);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  // 디바운스 검색만 담당(AC-C1.1). query 가 최소 글자수 이상일 때만 예약, 다음 입력 시 취소.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) return;
    const t = setTimeout(async () => {
      const my = ++reqId.current;
      try {
        const r = await searchChannels(q);
        if (my !== reqId.current) return; // 최신 요청만 반영(경합 방지)
        setCandidates(r.candidates);
        setCapped(r.capped);
      } catch {
        if (my === reqId.current) setCandidates([]);
      } finally {
        if (my === reqId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  async function add(c: SearchCandidate) {
    if (adding) return;
    setAdding(c.channelId);
    const r = await addSubscriptionById(c.channelId);
    setAdding(null);
    if (r.ok) {
      showToast(`추가됨: ${r.addedTitle}`);
      setCandidates((prev) =>
        prev.map((x) => (x.channelId === c.channelId ? { ...x, subscribed: true } : x)),
      );
      router.refresh();
    } else {
      showToast(r.error ?? '추가에 실패했습니다');
    }
  }

  const showEmpty =
    query.trim().length >= MIN_CHARS && !searching && candidates.length === 0 && !capped;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="채널 이름으로 검색 (예: 슈카월드)"
          data-testid="channel-search"
          aria-label="채널 검색"
        />
        {searching && (
          <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>

      {capped && (
        <p className="text-xs text-muted-foreground">
          오늘 검색 한도에 도달했어요. 아래에서 URL·핸들로 직접 추가할 수 있어요.
        </p>
      )}

      {candidates.length > 0 && (
        <ul
          data-testid="channel-candidates"
          className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border"
        >
          {candidates.map((c) => (
            <li key={c.channelId} className="flex items-center gap-3 px-3 py-2">
              <ChannelAvatar src={c.thumbnail} title={c.title} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                {c.handle && <p className="truncate text-xs text-muted-foreground">{c.handle}</p>}
              </div>
              {c.subscribed ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  구독됨
                </span>
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
          ))}
        </ul>
      )}

      {showEmpty && (
        <p className="text-xs text-muted-foreground">
          검색 결과가 없어요. 아래에서 URL·핸들로 직접 추가해 보세요.
        </p>
      )}
    </div>
  );
}
