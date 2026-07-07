import Link from 'next/link';

/**
 * 홈 최상단 배너 (메뉴 바로 밑). 클릭 시 친구 초대 & 크레딧 화면(/referral)으로 이동한다.
 */
export default function ReferralBanner() {
  return (
    <Link
      href="/referral"
      data-testid="referral-banner"
      className="group flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 transition-colors hover:bg-accent/20"
    >
      <span className="text-xl leading-none" aria-hidden>
        🎁
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">친구 추천하고 크레딧 받아보세요</p>
        <p className="text-xs text-muted-foreground">
          친구와 나 모두 2,000원씩, 최대 50,000원 보상받기
        </p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}
