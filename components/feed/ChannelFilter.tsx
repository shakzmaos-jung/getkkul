'use client';

import { useState } from 'react';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import type { FeedChannel } from '@/components/feed/FeedContent';

/** 다이제스트 채널 멀티체크 필터. default 전체. 체크 변경 시 상위(캘린더 수·목록)가 재집계된다. */
export default function ChannelFilter({
  channels,
  checked,
  onChange,
}: {
  channels: FeedChannel[];
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const allChecked = checked.size === channels.length;
  const label = allChecked ? '전체' : checked.size === 0 ? '선택 없음' : `${checked.size}개 채널`;

  function toggle(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }
  function toggleAll() {
    onChange(allChecked ? new Set() : new Set(channels.map((c) => c.id)));
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="channel-filter"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
      >
        <span className="font-medium">채널</span>
        <span className="text-muted-foreground">· {label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted-foreground">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-40 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="accent-foreground"
              />
              <span className="text-sm font-medium">전체</span>
            </label>
            <div className="my-1 border-t border-border" />
            {channels.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={checked.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="accent-foreground"
                />
                <ChannelAvatar src={c.thumbnail} title={c.title} size={20} />
                <span className="truncate text-sm">{c.title}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
