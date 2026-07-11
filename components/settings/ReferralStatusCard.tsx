import { REFERRAL_STATUS_LABEL } from '@/lib/referral/format';
import { ACTIVATION_MIN_CHANNELS, ACTIVATION_MIN_SUMMARIES } from '@/lib/referral/constants';
import type { ReferralProgressRow } from '@/lib/referral/queries';

/**
 * 초대한 내역 (REQ-G2). 초대한 친구별로 이메일 + 진행률(구독 채널 x/3, 다이제스트 y/10) +
 * 목표 달성률 + 상태를 표시한다. 각 행에 id=referral-<id> 앵커(크레딧 적립 내역 딥링크 대상).
 */
export default function ReferralStatusCard({ rows }: { rows: ReferralProgressRow[] }) {
  const visible = rows.filter((r) => r.status !== 'void');
  return (
    <div>
      {visible.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          아직 초대한 친구가 없어요. 링크를 공유해 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="referral-list">
          {visible.map((r) => {
            // 달성률 = (구독 채널 + 다이제스트) / (3 + 10 = 13). 초과분은 상한 처리.
            const chCapped = Math.min(r.channel_count, ACTIVATION_MIN_CHANNELS);
            const sumCapped = Math.min(r.summary_count, ACTIVATION_MIN_SUMMARIES);
            const denom = ACTIVATION_MIN_CHANNELS + ACTIVATION_MIN_SUMMARIES; // 13
            const rate = Math.min(100, Math.round(((chCapped + sumCapped) / denom) * 100));
            const done = r.status === 'activated';
            return (
              // 활성화(지급 완료) 후에도 카드는 남긴다(기록 관리). id 앵커 = 크레딧 적립 딥링크 대상.
              <li
                key={r.referral_id}
                id={`referral-${r.referral_id}`}
                className="scroll-mt-20 rounded-lg border border-border p-3"
              >
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

                {/* 각 지표 카드: 좌→우로 달성 수준만큼 색이 채워진다. */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <StatFill
                    label="구독 채널"
                    have={r.channel_count}
                    need={ACTIVATION_MIN_CHANNELS}
                  />
                  <StatFill
                    label="다이제스트"
                    have={r.summary_count}
                    need={ACTIVATION_MIN_SUMMARIES}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** 기준 대비 실적을 좌→우 색 채움으로 표현하는 지표 카드. */
function StatFill({ label, have, need }: { label: string; have: number; need: number }) {
  const pct = Math.min(100, need > 0 ? (have / need) * 100 : 0);
  return (
    <div className="relative overflow-hidden rounded-md border border-border">
      <div
        className="absolute inset-y-0 left-0 bg-accent/25 transition-all"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between px-2 py-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {have}/{need}
        </span>
      </div>
    </div>
  );
}
