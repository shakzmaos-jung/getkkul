import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatWon, TXN_KIND_LABEL } from '@/lib/referral/format';
import { PER_USER_CAP } from '@/lib/referral/constants';
import { formatKstDateTime } from '@/lib/time';
import { maskEmail } from '@/lib/referral/mask';
import type { CreditLedger, CreditTxnRow } from '@/lib/referral/queries';

/** 트랜잭션 이동 대상: 적립→친구 초대(딥링크), 사용→결제 내역. 그 외는 없음. */
function txnHref(t: CreditTxnRow): string | null {
  if (t.kind === 'grant') return t.sourceReferralId ? `/referral#referral-${t.sourceReferralId}` : '/referral';
  if (t.kind === 'usage') return '/membership';
  return null;
}
function txnNavLabel(t: CreditTxnRow): string | null {
  if (t.kind === 'grant') return '친구 초대 내역';
  if (t.kind === 'usage') return '결제 내역';
  return null;
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-lg font-semibold tabular-nums tracking-tight" data-testid={testId}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * 크레딧 (REQ-G). 총 획득/사용/잔여 블록과 적립·사용 내역 블록을 카드로 분리한다.
 * 적립 항목은 어떤 친구 초대인지 마스킹 이메일 + 친구 초대 내역 이동, 사용 항목은 결제 내역 이동.
 * 일시는 yyyy-mm-dd hh:mm.
 */
export default function CreditLedgerCard({
  ledger,
  referralEmails = {},
}: {
  ledger: CreditLedger;
  referralEmails?: Record<string, string | null>;
}) {
  const { balance, expiringSoon, totalEarned, totalUsed, transactions } = ledger;
  return (
    <div className="flex flex-col gap-4">
      {/* 1) 총 획득 / 총 사용 / 잔여 */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="총 획득" value={formatWon(totalEarned)} testId="credit-earned" />
          <Stat label="총 사용" value={formatWon(totalUsed)} testId="credit-used" />
          <Stat label="잔여" value={formatWon(balance)} testId="credit-balance" />
        </div>
        {expiringSoon > 0 && (
          <p className="mt-2 text-right text-xs text-danger" data-testid="credit-expiring">
            30일 내 만료 {formatWon(expiringSoon)}
          </p>
        )}
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          크레딧은 친구추천으로 <span className="font-medium text-foreground">최대 {formatWon(PER_USER_CAP)}</span>까지
          적립할 수 있어요. 향후{' '}
          <span className="font-medium text-foreground">유료 결제 시 결제액의 50%까지 할인</span>에 사용할 수
          있고, 현금 환급·양도는 되지 않아요.
        </p>
      </Card>

      {/* 2) 적립 · 사용 내역 */}
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold">적립 · 사용 내역</h3>
        {transactions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">아직 크레딧 내역이 없어요.</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="credit-history">
            {transactions.map((t) => {
              const href = txnHref(t);
              const navLabel = txnNavLabel(t);
              // 적립 항목: 어떤 친구인지 마스킹 이메일.
              const friend =
                t.kind === 'grant' && t.sourceReferralId
                  ? maskEmail(referralEmails[t.sourceReferralId])
                  : null;
              const inner = (
                <>
                  <div className="min-w-0">
                    <span className="font-medium">{TXN_KIND_LABEL[t.kind]}</span>
                    {friend && <span className="ml-2 text-xs text-foreground/70">{friend}</span>}
                    {navLabel && href && (
                      <span className="ml-2 text-xs text-accent">{navLabel} →</span>
                    )}
                    {t.memo && <span className="ml-2 text-xs text-muted-foreground">{t.memo}</span>}
                    <p className="text-xs text-muted-foreground">{formatKstDateTime(t.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 tabular-nums font-medium ${t.delta >= 0 ? 'text-accent' : 'text-muted-foreground'}`}
                  >
                    {t.delta >= 0 ? '+' : '−'}
                    {formatWon(Math.abs(t.delta))}
                  </span>
                </>
              );
              return href ? (
                <li key={t.id}>
                  <Link
                    href={href}
                    data-testid="credit-txn"
                    className="flex items-center justify-between gap-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    {inner}
                  </Link>
                </li>
              ) : (
                <li key={t.id} data-testid="credit-txn" className="flex items-center justify-between gap-3 py-2 text-sm">
                  {inner}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
