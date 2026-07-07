import ReferralShareButton from '@/components/settings/ReferralShareButton';
import { REFERRAL_STATUS_LABEL } from '@/lib/referral/format';
import { ACTIVATION_MIN_CHANNELS, ACTIVATION_MIN_SUMMARIES } from '@/lib/referral/constants';
import type { ReferralProgressRow } from '@/lib/referral/queries';

/**
 * 추천 현황 (REQ-G2). 상단에 내 추천 링크(공유), 아래에 피추천인별 진행률(채널 x/3, 요약 y/10)과
 * 상태(대기/지급완료)만 표시한다. 구체 활동(구독 채널 등)은 노출하지 않는다(AC-G2.2).
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
        친구가 이 링크로 가입해 채널 {ACTIVATION_MIN_CHANNELS}개 구독 + 요약 {ACTIVATION_MIN_SUMMARIES}개를
        받으면, 친구와 나 모두 크레딧 2,000원을 받아요.
      </p>

      {visible.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          아직 초대한 친구가 없어요. 링크를 공유해 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((r, i) => {
            const chPct = Math.min(100, (r.channel_count / ACTIVATION_MIN_CHANNELS) * 100);
            const sumPct = Math.min(100, (r.summary_count / ACTIVATION_MIN_SUMMARIES) * 100);
            const done = r.status === 'activated';
            return (
              <li key={r.referral_id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">친구 {i + 1}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      done ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done ? '지급 완료 🎉' : REFERRAL_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <ProgressRow
                  label="채널 구독"
                  have={Math.min(r.channel_count, ACTIVATION_MIN_CHANNELS)}
                  need={ACTIVATION_MIN_CHANNELS}
                  pct={chPct}
                />
                <ProgressRow
                  label="요약 수신"
                  have={Math.min(r.summary_count, ACTIVATION_MIN_SUMMARIES)}
                  need={ACTIVATION_MIN_SUMMARIES}
                  pct={sumPct}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  have,
  need,
  pct,
}: {
  label: string;
  have: number;
  need: number;
  pct: number;
}) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {have}/{need}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
