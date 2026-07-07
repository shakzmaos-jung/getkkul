'use client';

import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

type Tab = 'invite' | 'credit';

/**
 * 친구 초대 / 내 크레딧 을 상단 메뉴 하위 2개 탭 카드로 분리한다.
 * 좌측=친구 초대(배너 진입 시 기본 선택), 우측=내 크레딧. 각 탭 제목 우측에 건수 배지 표시.
 * 두 콘텐츠는 서버에서 렌더된 노드를 prop 으로 받아 활성 탭만 노출한다.
 */
export default function ReferralTabs({
  inviteCount,
  grantCount,
  invite,
  credit,
  defaultTab = 'invite',
}: {
  inviteCount: number;
  grantCount: number;
  invite: ReactNode;
  credit: ReactNode;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="친구 초대 / 크레딧">
        <TabCard
          active={tab === 'invite'}
          onClick={() => setTab('invite')}
          title="친구 초대"
          count={inviteCount}
          testId="tab-invite"
        />
        <TabCard
          active={tab === 'credit'}
          onClick={() => setTab('credit')}
          title="내 크레딧"
          count={grantCount}
          testId="tab-credit"
        />
      </div>

      <Card className="p-5">{tab === 'invite' ? invite : credit}</Card>
    </div>
  );
}

function TabCard({
  active,
  onClick,
  title,
  count,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  count: number;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition-colors ${
        active
          ? 'border-accent bg-accent/20 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'
      }`}
    >
      <span>{title}</span>
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            active ? 'bg-accent/30 text-accent' : 'bg-muted text-muted-foreground'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
