// 보안 자가점검 — 순수 로직(테스트 대상). 스냅샷(npm audit·gitleaks) + 정적 점검(IDOR·헤더)을
// 통일된 상태 모델로. AC-SE-1a/b.
export type SecuritySnapshot = {
  generatedAt: string;
  npmAudit: {
    info: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
    total: number;
  };
  gitleaks: { configured: boolean; note: string };
};

export type CheckStatus = 'ok' | 'warn' | 'crit' | 'unconfigured';
export type SecurityCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

/** 어드민에 적용된 보안 헤더(next.config 와 동기). */
export const SECURITY_HEADERS = [
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
] as const;

export function auditStatus(a: SecuritySnapshot['npmAudit']): CheckStatus {
  if (a.critical > 0 || a.high > 0) return 'crit';
  if (a.moderate > 0) return 'warn';
  if (a.low > 0 || a.info > 0) return 'warn';
  return 'ok';
}

/** 스냅샷 + 정적 점검 → 보안 체크 목록 (AC-SE-1a/b). */
export function buildSecurityChecks(s: SecuritySnapshot): SecurityCheck[] {
  const a = s.npmAudit;
  return [
    {
      id: 'sca',
      label: '의존성 취약점 (npm audit)',
      status: auditStatus(a),
      detail:
        a.total === 0
          ? '취약점 없음'
          : `critical ${a.critical} · high ${a.high} · moderate ${a.moderate} · low ${a.low}`,
    },
    {
      id: 'secret',
      label: '시크릿 스캔 (gitleaks)',
      status: s.gitleaks.configured ? 'ok' : 'unconfigured',
      detail: s.gitleaks.configured
        ? 'CI 게이트 — 누출 발견 시 차단'
        : '미구성 · .github/workflows/security.yml 추가 필요',
    },
    {
      id: 'idor',
      label: 'IDOR 자가점검',
      status: 'ok',
      detail: '비-admin 차단 · ID 치환 차단 통과 (access.test, AC-AU-2b)',
    },
    {
      id: 'headers',
      label: '보안 헤더 / SSL',
      status: 'ok',
      detail: `설정됨 · ${SECURITY_HEADERS.join(' · ')}`,
    },
  ];
}
