import ReferralShareButton from '@/components/settings/ReferralShareButton';
import { REFERRAL_STATUS_LABEL } from '@/lib/referral/format';
import { ACTIVATION_MIN_CHANNELS, ACTIVATION_MIN_SUMMARIES } from '@/lib/referral/constants';
import type { ReferralProgressRow } from '@/lib/referral/queries';

/**
 * 추천 현황 (REQ-G2). 상단에 내 추천 링크(공유), 아래에 초대한 친구별로
 * 이메일 + 진행률(구독 채널 x/3, 다이제스트 y/10) + 목표 달성률 + 상태를 표시한다.
 * 친구가 가입하면 대기 상태로 즉시 나타나고(카운트 0부터), 활성화되면 지급 완료로 바뀐다.
 */
export default function ReferralStatusCard({
  link,
  rows,
}: {
  link: string;
  rows: ReferralProgressRow[];
}) {
  const visible = rows.filter((r) => r.status !== 'void');
  return (
    <div>
      <ReferralShareButton link={link} />
      <p className="mt-2 mb-4 text-xs text-muted-foreground">
        친구가 이 링크로 가입해 채널 {ACTIVATION_MIN_CHANNELS}개 구독 + 다이제스트 {ACTIVATION_MIN_SUMMARIES}개를
        받으면, 친구와 나 모두 크레딧 2,000원을 받아요.
      </p>

      {visible.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          아직 초대한 친구가 없어요. 링크를 공유해 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="referral-list">
          {visible.map((r) => {
            const ch = Math.min(r.channel_count, ACTIVATION_MIN_CHANNELS);
            const sum = Math.min(r.summary_count, ACTIVATION_MIN_SUMMARIES);
            const rate =
              r.status === 'activated'
                ? 100
                : Math.round(((ch / ACTIVATION_MIN_CHANNELS + sum / ACTIVATION_MIN_SUMMARIES) / 2) * 100);
            const done = r.status === 'activated';
            return (
              <li key={r.referral_id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium" title={r.referee_email ?? ''}>
                    {r.referee_email ?? '친구'}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      done ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? '지급 완료 🎉' : REFERRAL_STATUS_LABEL[r.status]}
                  </span>
                </div>

                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">목표 달성률</span>
                  <span className="font-semibold tabular-nums">{rate}%</span>
                </div>
                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted px-2 py-1.5 text-center">
                    <span className="text-muted-foreground">구독 채널</span>{' '}
                    <span className="font-semibold tabular-nums">
                      {r.channel_count}/{ACTIVATION_MIN_CHANNELS}
                    </span>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5 text-center">
                    <span className="text-muted-foreground">다이제스트</span>{' '}
                    <span className="font-semibold tabular-nums">
                      {r.summary_count}/{ACTIVATION_MIN_SUMMARIES}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
