import { formatWon, TXN_KIND_LABEL } from '@/lib/referral/format';
import type { CreditLedger } from '@/lib/referral/queries';

/**
 * 크레딧 내역 (REQ-G1). 상단에 사용 가능 잔액 + 곧 만료 예정(AC-G1.1),
 * 아래에 지급·사용·만료·소멸 내역을 시간순으로(AC-G1.2), 결제 할인 안내 문구(AC-G1.3).
 */
export default function CreditLedgerCard({ ledger }: { ledger: CreditLedger }) {
  const { balance, expiringSoon, transactions } = ledger;
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">사용 가능 크레딧</p>
          <p className="text-2xl font-semibold tracking-tight" data-testid="credit-balance">
            {formatWon(balance)}
          </p>
        </div>
        {expiringSoon > 0 && (
          <p className="text-xs text-danger" data-testid="credit-expiring">
            30일 내 만료 {formatWon(expiringSoon)}
          </p>
        )}
      </div>

      <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        크레딧은 향후 유료 결제 시 결제액의 50%까지 할인에 사용할 수 있어요. 현금 환급·양도는 되지 않아요.
      </p>

      {transactions.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">아직 크레딧 내역이 없어요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium">{TXN_KIND_LABEL[t.kind]}</span>
                {t.memo && <span className="ml-2 text-xs text-muted-foreground">{t.memo}</span>}
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 tabular-nums font-medium ${t.delta >= 0 ? 'text-accent' : 'text-muted-foreground'}`}
              >
                {t.delta >= 0 ? '+' : '−'}
                {formatWon(Math.abs(t.delta))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
