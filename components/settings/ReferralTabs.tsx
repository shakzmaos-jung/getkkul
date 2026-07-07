'use client';

import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { TabCards } from '@/components/ui/TabCards';

type Tab = 'invite' | 'credit';

/**
 * 친구 초대 / 내 크레딧 을 상단 메뉴 하위 2개 탭 카드로 분리한다.
 * 좌측=친구 초대(배너 진입 시 기본 선택), 우측=내 크레딧. 각 탭 제목 우측에 건수 배지 표시.
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
      <TabCards
        ariaLabel="친구 초대 / 크레딧"
        className="mb-4"
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'invite', title: '친구 초대', count: inviteCount },
          { key: 'credit', title: '내 크레딧', count: grantCount },
        ]}
      />
      <Card className="p-5">{tab === 'invite' ? invite : credit}</Card>
    </div>
  );
}
