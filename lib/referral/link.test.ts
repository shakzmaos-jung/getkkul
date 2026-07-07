import { describe, it, expect } from 'vitest';
import { linkReferralOnSignup } from './link';

// 체이닝 supabase 빌더의 최소 페이크. from(table) 마다 새 빌더를 돌려준다.
function fakeAdmin(config: {
  code?: { user_id: string } | null;
  existingReferral?: { id: string } | null;
  insertError?: boolean;
}) {
  const calls = { upserts: [] as unknown[], inserts: [] as unknown[] };
  const client = {
    from(table: string) {
      const builder = {
        _insert: false,
        upsert(vals: unknown, opts: unknown) {
          calls.upserts.push({ table, vals, opts });
          return Promise.resolve({ error: null });
        },
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        insert(vals: unknown) {
          calls.inserts.push({ table, vals });
          builder._insert = true;
          return builder;
        },
        maybeSingle() {
          if (table === 'referral_codes') return Promise.resolve({ data: config.code ?? null, error: null });
          if (table === 'referrals') {
            if (builder._insert) {
              return Promise.resolve(
                config.insertError
                  ? { data: null, error: { message: 'conflict' } }
                  : { data: { id: 'new-ref' }, error: null },
              );
            }
            return Promise.resolve({ data: config.existingReferral ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return builder;
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: client as any, calls };
}

const CODE = 'ABCDE23456';

describe('linkReferralOnSignup (REQ-B)', () => {
  it('유효 코드 → pending referral 생성 + abuse_guard 확보', async () => {
    const { admin, calls } = fakeAdmin({ code: { user_id: 'referrer-1' } });
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: 'friend@example.com',
      code: CODE,
    });
    expect(r).toEqual({ linked: true, referrerUserId: 'referrer-1', referralId: 'new-ref' });
    expect(calls.upserts).toHaveLength(1); // abuse_guard 확보(AC-I1.1)
    expect(calls.inserts).toHaveLength(1);
  });

  it('코드 없음 → no_code (귀속 안 함)', async () => {
    const { admin, calls } = fakeAdmin({});
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: 'x@example.com',
      code: null,
    });
    expect(r).toEqual({ linked: false, reason: 'no_code' });
    expect(calls.inserts).toHaveLength(0);
  });

  it('형식 오류 코드 → invalid_code', async () => {
    const { admin } = fakeAdmin({});
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: null,
      code: 'nope',
    });
    expect(r).toEqual({ linked: false, reason: 'invalid_code' });
  });

  it('존재하지 않는 코드 → unknown_code', async () => {
    const { admin } = fakeAdmin({ code: null });
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: null,
      code: CODE,
    });
    expect(r).toEqual({ linked: false, reason: 'unknown_code' });
  });

  it('자기추천(코드 주인 == 가입자) → self, 관계 미생성 (AC-B1.3)', async () => {
    const { admin, calls } = fakeAdmin({ code: { user_id: 'same-user' } });
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'same-user',
      refereeEmail: null,
      code: CODE,
    });
    expect(r).toEqual({ linked: false, reason: 'self' });
    expect(calls.inserts).toHaveLength(0);
  });

  it('이미 귀속된 피추천인 → already (AC-B1.2)', async () => {
    const { admin, calls } = fakeAdmin({
      code: { user_id: 'referrer-1' },
      existingReferral: { id: 'old-ref' },
    });
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: null,
      code: CODE,
    });
    expect(r).toEqual({ linked: false, reason: 'already' });
    expect(calls.inserts).toHaveLength(0);
  });

  it('삽입 경합(unique 위반) → already', async () => {
    const { admin } = fakeAdmin({ code: { user_id: 'referrer-1' }, insertError: true });
    const r = await linkReferralOnSignup(admin, {
      refereeUserId: 'referee-1',
      refereeEmail: null,
      code: CODE,
    });
    expect(r).toEqual({ linked: false, reason: 'already' });
  });
});
