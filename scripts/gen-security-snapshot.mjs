// 보안 스냅샷 생성 (M6, AC-SE-1a). npm audit 결과를 어드민이 읽을 JSON으로 저장.
//   실행: npm run gen:security
//   산출: apps/admin/data/security-snapshot.json (어드민 보안 페이지가 import)
// gitleaks 결과는 CI(.github/workflows/security.yml)가 게이트로 집행 — 여기선 구성 여부만 표기.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// npm audit 는 취약점이 있으면 exit code≠0 → stdout 의 JSON 을 그대로 파싱.
let audit = {};
try {
  const out = execSync('npm audit --json', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  audit = JSON.parse(out);
} catch (e) {
  try {
    audit = JSON.parse(e.stdout || '{}');
  } catch {
    audit = {};
  }
}

const v = audit?.metadata?.vulnerabilities ?? {};
const gitleaksConfigured = existsSync(resolve(ROOT, '.github/workflows/security.yml'));

const snapshot = {
  generatedAt: new Date().toISOString(),
  npmAudit: {
    info: v.info ?? 0,
    low: v.low ?? 0,
    moderate: v.moderate ?? 0,
    high: v.high ?? 0,
    critical: v.critical ?? 0,
    total: v.total ?? 0,
  },
  gitleaks: {
    configured: gitleaksConfigured,
    note: gitleaksConfigured ? 'CI(security.yml) PR 게이트' : '미구성',
  },
};

const dest = resolve(ROOT, 'apps/admin/data/security-snapshot.json');
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`[security-snapshot] npm audit ${JSON.stringify(snapshot.npmAudit)} · gitleaks ${gitleaksConfigured ? 'configured' : 'off'}`);
