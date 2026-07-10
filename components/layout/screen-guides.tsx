import Link from 'next/link';
import type { ReactNode } from 'react';
import { activeTabKey } from '@/lib/nav/tabs';

const GUIDE_LINK = 'font-medium text-accent hover:underline';

export interface ScreenGuide {
  title: string;
  description: string;
  points: ReactNode[];
}

/** 탭 화면별 '이용 가이드' 콘텐츠(헤더 타이틀 우측 뱃지 → 다이얼로그). 탭이 아닌 화면은 가이드 없음. */
const GUIDES: Partial<Record<NonNullable<ReturnType<typeof activeTabKey>>, ScreenGuide>> = {
  home: {
    title: '홈',
    description: '겟꿀은 유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드리는 서비스입니다.',
    points: [
      <>
        관심 있는 유튜브 채널을{' '}
        <Link href="/subscriptions" className={GUIDE_LINK}>
          구독
        </Link>
        으로 추가하세요.
      </>,
      <>
        <Link href="/feed" className={GUIDE_LINK}>
          다이제스트
        </Link>
        에서 핵심 요약을 만나보세요.
      </>,
      '이메일 혹은 앱 푸시로 아침(07:30), 점심(11:30), 저녁(17:30)에 알림을 받을 수 있습니다.',
    ],
  },
  feed: {
    title: '다이제스트',
    description: '구독한 채널의 새 영상 요약입니다. 카드마다 요약 길이를 바꿀 수 있어요.',
    points: [
      '구독한 채널의 새 영상을 대신 보고, 핵심만 요약해 카드로 보여드려요.',
      '카드마다 짧게 / 보통 / 길게로 요약 길이를 바꿀 수 있어요.',
      '달력에서 날짜를 고르고 채널 필터로 좁혀 볼 수 있어요.',
      '북마크(노란 아이콘)로 저장하면 상단 "북마크" 탭에서 모아볼 수 있어요.',
      'AI 배지를 눌러 이 콘텐츠에 대해 궁금한 점을 물어볼 수 있어요.',
    ],
  },
  channels: {
    title: '채널',
    description: '감시할 유튜브 채널을 관리하세요.',
    points: [
      '채널 이름으로 검색해서 바로 추가하세요. 안 나오면 URL·핸들(@…)로도 추가할 수 있어요.',
      '일시정지하면 그 채널의 새 다이제스트를 잠시 멈춰요.',
      '정지해제하면 그 이후에 올라온 영상부터 다시 받아요(밀린 영상은 몰아 오지 않아요).',
      '구독중 / 일시 정지 탭으로 상태별로 볼 수 있어요.',
    ],
  },
};

/** 현재 경로에 해당하는 화면 가이드. 없으면 null(멤버십·설정 등). */
export function guideForPath(pathname: string): ScreenGuide | null {
  const key = activeTabKey(pathname);
  return (key && GUIDES[key]) || null;
}
