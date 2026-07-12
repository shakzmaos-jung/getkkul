import { describe, it, expect, vi, beforeEach } from 'vitest';

// server-only 는 서버 외 환경에서 import 시 throw → 테스트에선 no-op 로 스텁.
vi.mock('server-only', () => ({}));

const getClaims = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getClaims, getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  })),
}));

import { requireAdmin, AdminAuthError } from './require-admin';

beforeEach(() => {
  getClaims.mockReset();
  getUser.mockReset();
  maybeSingle.mockReset();
});

describe('requireAdmin (심층 방어 인가 게이트, 6a)', () => {
  it('세션이 없으면 AdminAuthError 를 던진다(데이터 미노출)', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} } });
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminAuthError);
  });

  it('로그인했으나 admin_users 에 없으면 던진다(비관리자 차단)', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } } });
    maybeSingle.mockResolvedValue({ data: null });
    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminAuthError);
  });

  it('admin(master/sub_master) 이면 membership 을 반환한다', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'master' } });
    await expect(requireAdmin()).resolves.toEqual({ role: 'master' });
  });

  it('getClaims 실패 시 getUser 로 폴백해 판정한다', async () => {
    getClaims.mockRejectedValue(new Error('no claims'));
    getUser.mockResolvedValue({ data: { user: { id: 'u2' } } });
    maybeSingle.mockResolvedValue({ data: { role: 'sub_master' } });
    await expect(requireAdmin()).resolves.toEqual({ role: 'sub_master' });
  });
});
