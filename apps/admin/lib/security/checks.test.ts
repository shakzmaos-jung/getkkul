import { describe, it, expect } from 'vitest';
import {
  auditStatus,
  buildSecurityChecks,
  type SecuritySnapshot,
} from './checks';

const snap = (over: Partial<SecuritySnapshot>): SecuritySnapshot => ({
  generatedAt: '2026-07-12T11:00:00Z',
  npmAudit: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
  gitleaks: { configured: true, note: 'CI' },
  ...over,
});

describe('auditStatus (AC-SE-1a)', () => {
  it('critical/high → crit, moderate → warn, 없음 → ok', () => {
    expect(auditStatus({ info: 0, low: 0, moderate: 0, high: 0, critical: 1, total: 1 })).toBe('crit');
    expect(auditStatus({ info: 0, low: 0, moderate: 0, high: 2, critical: 0, total: 2 })).toBe('crit');
    expect(auditStatus({ info: 0, low: 0, moderate: 3, high: 0, critical: 0, total: 3 })).toBe('warn');
    expect(auditStatus({ info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 })).toBe('ok');
  });
});

describe('buildSecurityChecks (AC-SE-1a/b)', () => {
  it('4개 점검(SCA·시크릿·IDOR·헤더) 생성', () => {
    const checks = buildSecurityChecks(snap({ npmAudit: { info: 0, low: 0, moderate: 3, high: 0, critical: 0, total: 3 } }));
    expect(checks.map((c) => c.id)).toEqual(['sca', 'secret', 'idor', 'headers']);
    expect(checks[0].status).toBe('warn'); // moderate 3
    expect(checks[0].detail).toContain('moderate 3');
    expect(checks[1].status).toBe('ok'); // gitleaks configured
    expect(checks[2].status).toBe('ok'); // IDOR 통과
    expect(checks[3].status).toBe('ok'); // 헤더 설정됨
  });
  it('gitleaks 미구성이면 unconfigured (미구성 안내)', () => {
    const checks = buildSecurityChecks(snap({ gitleaks: { configured: false, note: '미구성' } }));
    expect(checks.find((c) => c.id === 'secret')?.status).toBe('unconfigured');
  });
});
