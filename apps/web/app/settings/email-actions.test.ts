import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OTP_MAX_ATTEMPTS } from '@/lib/delivery/otp';

// server-only 및 Next 런타임 훅 스텁.
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirect');
  },
}));

// requireUser 용 서버 클라이언트: 항상 로그인 사용자 u1.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  }),
}));

// admin(service_role) 클라이언트: maybeSingle 은 주입된 상태를, update 는 패치를 기록.
let singleState: Record<string, unknown> | null = null;
const updates: Record<string, unknown>[] = [];
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: singleState, error: null }) }),
      }),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const sendMock = vi.fn(async () => ({ id: 'm1' }));
vi.mock('@/lib/notify/create-notifier', () => ({
  createNotifier: () => ({ send: sendMock }),
}));

import { manageDeliveryEmail } from './email-actions';
import { hashOtp } from '@/lib/delivery/otp';

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  singleState = null;
  updates.length = 0;
  sendMock.mockClear();
});

describe('manageDeliveryEmail — OTP 남용 방지 (8a/8b)', () => {
  it('요청 쿨다운: 직전 요청이 60초 이내면 메일을 보내지 않고 차단한다(8b)', async () => {
    singleState = { otp_requested_at: new Date().toISOString() };
    const r = await manageDeliveryEmail({ step: 'request' }, fd({ intent: 'request', email: 'victim@example.com' }));
    expect(r.step).toBe('request');
    expect(r.error).toMatch(/1분에 한 번/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('요청 허용: 쿨다운 지났으면 메일 발송 + pending/requested_at 기록(8b)', async () => {
    singleState = { otp_requested_at: null };
    const r = await manageDeliveryEmail({ step: 'request' }, fd({ intent: 'request', email: 'me@example.com' }));
    expect(r.step).toBe('verify');
    expect(sendMock).toHaveBeenCalledTimes(1);
    const patch = updates.at(-1)!;
    expect(patch.pending_email).toBe('me@example.com');
    expect(patch.otp_requested_at).toBeTruthy();
    expect(patch.otp_attempts).toBe(0);
  });

  it('검증 오답(상한 미만): otp_attempts 를 증가시키고 verify 단계 유지(8a)', async () => {
    singleState = {
      pending_email: 'me@example.com',
      otp_hash: hashOtp('111111'),
      otp_expires_at: new Date(Date.now() + 60_000).toISOString(),
      otp_attempts: 0,
    };
    const r = await manageDeliveryEmail({ step: 'verify' }, fd({ intent: 'verify', code: '999999' }));
    expect(r.step).toBe('verify');
    expect(updates.at(-1)).toEqual({ otp_attempts: 1 });
  });

  it('검증 오답(상한 도달): pending 을 무효화하고 재요청으로 보낸다(8a 브루트포스 차단)', async () => {
    singleState = {
      pending_email: 'me@example.com',
      otp_hash: hashOtp('111111'),
      otp_expires_at: new Date(Date.now() + 60_000).toISOString(),
      otp_attempts: OTP_MAX_ATTEMPTS - 1, // 이번 실패로 상한 도달
    };
    const r = await manageDeliveryEmail({ step: 'verify' }, fd({ intent: 'verify', code: '999999' }));
    expect(r.step).toBe('request');
    expect(r.error).toMatch(/시도 횟수/);
    const patch = updates.at(-1)!;
    expect(patch.pending_email).toBeNull();
    expect(patch.otp_hash).toBeNull();
    expect(patch.otp_attempts).toBe(0);
  });

  it('검증 정답: delivery_email 저장 + attempts 리셋', async () => {
    singleState = {
      pending_email: 'me@example.com',
      otp_hash: hashOtp('123456'),
      otp_expires_at: new Date(Date.now() + 60_000).toISOString(),
      otp_attempts: 2,
    };
    const r = await manageDeliveryEmail({ step: 'verify' }, fd({ intent: 'verify', code: '123456' }));
    expect(r.ok).toBe(true);
    const patch = updates.at(-1)!;
    expect(patch.delivery_email).toBe('me@example.com');
    expect(patch.otp_attempts).toBe(0);
  });
});
