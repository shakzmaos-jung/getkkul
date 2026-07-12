import { describe, it, expect } from 'vitest';
import {
  resolveAdminAccess,
  isAdmin,
  hasRole,
  isAdminPublicPath,
  type AdminMembership,
} from './access';

const master: AdminMembership = { role: 'master' };
const subMaster: AdminMembership = { role: 'sub_master' };
const notAdmin: AdminMembership = null;

describe('isAdmin / hasRole', () => {
  it('membership 이 없으면 admin 아님', () => {
    expect(isAdmin(notAdmin)).toBe(false);
    expect(isAdmin(master)).toBe(true);
    expect(isAdmin(subMaster)).toBe(true);
  });
  it('master 는 sub_master 권한을 포함, 역은 성립하지 않음', () => {
    expect(hasRole(master, 'sub_master')).toBe(true);
    expect(hasRole(master, 'master')).toBe(true);
    expect(hasRole(subMaster, 'sub_master')).toBe(true);
    expect(hasRole(subMaster, 'master')).toBe(false);
    expect(hasRole(notAdmin, 'sub_master')).toBe(false);
  });
});

describe('resolveAdminAccess — 비-admin 차단 (AC-AU-2a)', () => {
  it('로그인했으나 admin_users 에 없으면 보호 경로에서 차단(리다이렉트)', () => {
    const d = resolveAdminAccess({
      hasSession: true,
      membership: notAdmin,
      pathname: '/overview',
    });
    expect(d.allow).toBe(false);
    expect(d).toMatchObject({ reason: 'not-admin', redirectTo: '/login' });
  });

  it('세션이 없으면 로그인으로', () => {
    const d = resolveAdminAccess({
      hasSession: false,
      membership: notAdmin,
      pathname: '/overview',
    });
    expect(d).toMatchObject({ allow: false, reason: 'no-session', redirectTo: '/login' });
  });

  it('admin(master/sub_master) 은 보호 경로 접근 허용', () => {
    for (const m of [master, subMaster]) {
      expect(
        resolveAdminAccess({ hasSession: true, membership: m, pathname: '/pipeline' }).allow,
      ).toBe(true);
    }
  });

  it('공개 경로(/login·/auth)는 세션/역할과 무관하게 허용', () => {
    expect(isAdminPublicPath('/login')).toBe(true);
    expect(isAdminPublicPath('/auth/callback')).toBe(true);
    expect(
      resolveAdminAccess({ hasSession: false, membership: notAdmin, pathname: '/login' }).allow,
    ).toBe(true);
  });
});

describe('resolveAdminAccess — IDOR 차단 (AC-AU-2b)', () => {
  it('URL에 타인(master)의 리소스 ID를 넣어도 비-admin 세션이면 차단', () => {
    const foreignId = '11111111-2222-3333-4444-555555555555';
    const d = resolveAdminAccess({
      hasSession: true,
      membership: notAdmin, // 세션 주체는 admin 아님
      pathname: `/ops/subscribers/${foreignId}`,
    });
    expect(d.allow).toBe(false);
    expect(d).toMatchObject({ reason: 'not-admin' });
  });

  it('판정은 pathname 의 식별자에 의존하지 않는다(같은 세션이면 경로가 달라도 결과 동일)', () => {
    const base = { hasSession: true, membership: notAdmin };
    const a = resolveAdminAccess({ ...base, pathname: '/ops/subscribers/aaaa' });
    const b = resolveAdminAccess({ ...base, pathname: '/ops/subscribers/bbbb' });
    expect(a).toEqual(b);
  });
});

describe('resolveAdminAccess — 역할 게이트 (AC-AU-2c)', () => {
  it('master 전용 경로(requiredRole=master)에서 sub_master 는 403', () => {
    const d = resolveAdminAccess({
      hasSession: true,
      membership: subMaster,
      pathname: '/ops/invite',
      requiredRole: 'master',
    });
    expect(d).toMatchObject({ allow: false, reason: 'insufficient-role', status: 403 });
  });

  it('master 전용 경로에서 master 는 허용', () => {
    const d = resolveAdminAccess({
      hasSession: true,
      membership: master,
      pathname: '/ops/invite',
      requiredRole: 'master',
    });
    expect(d).toMatchObject({ allow: true, reason: 'authorized' });
  });
});
