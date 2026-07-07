'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * 추천 링크 공유 (AC-A2.1/A2.2). OS 공유 시트가 있으면 사용, 없으면 클립보드 복사 + 토스트.
 * 링크는 서버에서 계산해 prop 으로 받는다(본인 코드 포함).
 */
export default function ReferralShareButton({ link }: { link: string }) {
  const showToast = useToast();
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareData = { title: '겟꿀 초대', text: '겟꿀에서 유튜브 요약을 받아보세요. 친구추천 크레딧도 받아요!', url: link };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // 사용자가 공유 시트를 닫음 등 → 복사로 폴백하지 않고 조용히 종료
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // 클립보드 실패해도 토스트로 링크를 안내
    }
    setCopied(true);
    showToast('추천 링크가 복사되었습니다');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="내 추천 링크"
        className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"
      />
      <Button type="button" variant="primary" size="md" onClick={share} data-testid="share-referral">
        {copied ? '복사됨' : '초대하기'}
      </Button>
    </div>
  );
}
