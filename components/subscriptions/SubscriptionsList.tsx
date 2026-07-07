'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ChannelAvatar } from '@/components/ui/ChannelAvatar';
import { TabCards } from '@/components/ui/TabCards';
import SubscriptionRowActions from '@/components/subscriptions/SubscriptionRowActions';

export type SubItem = {
  id: string;
  channel_id: string;
  channel_title: string | null;
  channel_url: string | null;
  channel_thumbnail: string | null;
  channel_handle: string | null;
  created_at: string;
  paused: boolean;
};

type Tab = 'active' | 'paused';

/** 구독시작일시(created_at, UTC) → KST yyyy-mm-dd hh:mm. */
function formatSubscribedDateTime(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** 구독중 / 일시정지 탭 카드로 채널 목록을 분리 표시. */
export default function SubscriptionsList({ subs }: { subs: SubItem[] }) {
  const [tab, setTab] = useState<Tab>('active');
  const activeCount = subs.filter((s) => !s.paused).length;
  const pausedCount = subs.length - activeCount;
  const list = subs.filter((s) => (tab === 'active' ? !s.paused : s.paused));

  return (
    <div className="mt-6">
      <TabCards
        ariaLabel="구독중 / 일시정지"
        className="mb-4"
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'active', title: '구독중', count: activeCount },
          { key: 'paused', title: '일시 정지', count: pausedCount },
        ]}
      />

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === 'paused' ? '일시정지한 채널이 없습니다.' : '구독중인 채널이 없습니다.'}
          </p>
        </div>
      ) : (
        <Card data-testid="subscription-list" className="divide-y divide-border overflow-hidden">
          {list.map((s) => (
            <div
              key={s.id}
              data-testid="subscription-item"
              className={`flex items-center justify-between gap-3 px-4 py-3 ${
                s.paused ? 'bg-muted' : ''
              }`}
            >
              <div className={`flex min-w-0 items-center gap-3 ${s.paused ? 'opacity-55' : ''}`}>
                <ChannelAvatar
                  src={s.channel_thumbnail}
                  title={s.channel_title ?? s.channel_id}
                  size={36}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <a
                      href={s.channel_url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {s.channel_title ?? s.channel_id}
                    </a>
                    {s.channel_handle && (
                      <span className="shrink-0 text-xs text-muted-foreground/70">
                        {s.channel_handle}
                      </span>
                    )}
                    {s.paused && (
                      <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                        ⏸ 일시정지됨
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    구독시작일시 {formatSubscribedDateTime(s.created_at)}
                  </p>
                </div>
              </div>
              <SubscriptionRowActions
                id={s.id}
                paused={s.paused}
                title={s.channel_title ?? s.channel_id}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
