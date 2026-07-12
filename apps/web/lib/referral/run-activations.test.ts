import { describe, it, expect, vi } from 'vitest';
import { runReferralActivations } from './run-activations';
import type { Notifier } from '@/lib/notify/notify';

/**
 * 페이지드 supabase 페이크: 테이블별 고정 결과를 돌려주는 thenable 빌더.
 * 체인이 .eq()(await) 로 끝나든 .maybeSingle() 로 끝나든 동일 결과로 resolve.
 */
function fakeSupabase(opts: {
  pendings: { referee_user_id: string }[];
  awarded: { award_user_id: string; award_amount: number; award_source: string }[];
  email?: string | null;
}) {
  const rpc = vi.fn(async () => ({ data: opts.awarded, error: null }));
  function resultFor(table: string) {
    switch (table) {
      case 'referrals':
        return { data: opts.pendings, error: null };
      case 'profiles':
        return { data: { email: opts.email ?? 'r@example.com' }, error: null };
      case 'user_settings':
        return { data: null, error: null };
      case 'credit_grants':
        return {
          data: [
            { id: 'g1', remaining_amount: 2000, expires_at: '2031-01-01T00:00:00Z', granted_at: '2026-01-01T00:00:00Z' },
          ],
          error: null,
        };
      case 'push_subscriptions':
        return { data: [], error: null };
      default:
        return { data: null, error: null };
    }
  }
  const client = {
    rpc,
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.in = chain;
      builder.delete = chain;
      builder.maybeSingle = () => Promise.resolve(resultFor(table));
      builder.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(resultFor(table)).then(resolve);
      return builder;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: client as any, rpc };
}

describe('runReferralActivations (REQ-C/D/H)', () => {
  it('활성화된 referral 의 수령자 모두에게 지급 알림을 보낸다', async () => {
    const { supabase, rpc } = fakeSupabase({
      pendings: [{ referee_user_id: 'e1' }],
      awarded: [
        { award_user_id: 'referrer1', award_amount: 2000, award_source: 'referrer' },
        { award_user_id: 'e1', award_amount: 2000, award_source: 'referee' },
      ],
    });
    const send = vi.fn(async () => ({ id: 'msg' }));
    const notifier: Notifier = { send };

    const r = await runReferralActivations({
      supabase,
      notifier,
      pushNotifier: null,
      nowIso: '2026-07-08T00:00:00Z',
    });

    expect(rpc).toHaveBeenCalledWith('activate_and_award', { p_referee: 'e1' });
    expect(r.activated).toBe(1);
    expect(r.grantsIssued).toBe(2);
    expect(r.emailsSent).toBe(2); // 두 수령자 모두 이메일 발송(AC-H1.1)
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('지급이 없으면(미충족/무지급) 알림하지 않는다', async () => {
    const { supabase } = fakeSupabase({ pendings: [{ referee_user_id: 'e1' }], awarded: [] });
    const send = vi.fn(async () => ({ id: 'msg' }));

    const r = await runReferralActivations({
      supabase,
      notifier: { send },
      pushNotifier: null,
    });

    expect(r.activated).toBe(0);
    expect(r.grantsIssued).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
