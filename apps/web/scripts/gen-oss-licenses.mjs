// 오픈소스 라이선스 데이터 생성 (재현 가능 — 의존성 바뀌면 재실행만).
//   실행: npm run gen:oss-licenses  (node_modules 설치 후)
// license-checker 를 npx 로 실행(런타임/dev 의존성 추가 없음), 각 패키지의 LICENSE 전문을 읽어
//   - apps/web/lib/oss/oss-licenses.json  (고지 페이지가 import)
//   - docs/oss-licenses.md                 (사람용 표 + 카피레프트 요약, 리포 루트 유지)
// 두 산출물을 생성한다.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ROOT = apps/web (license-checker cwd + 페이지용 JSON 산출 기준).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// REPO_ROOT = 모노레포 루트. 사람용 docs/ 는 거버넌스 문서로 리포 루트에 유지한다.
const REPO_ROOT = resolve(ROOT, '..', '..');
const LICENSE_CHECKER = 'license-checker@25.0.1'; // 재현성 위해 버전 고정
const MAX_TEXT = 15000; // 라이선스 전문 패키지당 상한

// 카피레프트/파일단위 카피레프트 계열 감지(고지·리스크 표기용).
const COPYLEFT = /\b(A?GPL|LGPL|MPL|EUPL|CDDL|EPL|CeCILL)\b/i;

function run() {
  const raw = execFileSync('npx', ['--yes', LICENSE_CHECKER, '--production', '--json'], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
  return JSON.parse(raw);
}

function toEntry(key, v) {
  const at = key.lastIndexOf('@'); // 스코프(@scope/name)의 @ 는 index 0 이라 안전
  const name = key.slice(0, at);
  const version = key.slice(at + 1);
  let licenseText = '';
  if (v.licenseFile) {
    try {
      licenseText = readFileSync(v.licenseFile, 'utf8').slice(0, MAX_TEXT);
    } catch {
      /* 파일 없거나 읽기 실패 → 링크로 대체 */
    }
  }
  return {
    name,
    version,
    license: String(v.licenses ?? 'UNKNOWN'),
    repository: v.repository ?? '',
    publisher: v.publisher ?? '',
    licenseText,
  };
}

const rawData = run();
const entries = Object.entries(rawData)
  .filter(([k]) => !k.startsWith('getkkul@')) // 자사 앱 제외
  .map(([k, v]) => toEntry(k, v))
  .sort((a, b) => a.name.localeCompare(b.name));

// 1) JSON (페이지용)
mkdirSync(resolve(ROOT, 'lib/oss'), { recursive: true });
writeFileSync(resolve(ROOT, 'lib/oss/oss-licenses.json'), JSON.stringify(entries, null, 2) + '\n');

// 2) docs 표 + 카피레프트 요약
const byLicense = {};
for (const e of entries) byLicense[e.license] = (byLicense[e.license] ?? 0) + 1;
const copyleft = entries.filter((e) => COPYLEFT.test(e.license));

const md = [
  '# getkkul 오픈소스 라이선스',
  '',
  '> 자동 생성 파일입니다. 수정하지 마세요. 의존성 변경 시 `npm run gen:oss-licenses` 로 재생성.',
  '',
  `프로덕션 의존성 **${entries.length}개**.`,
  '',
  '## 라이선스별 개수',
  '',
  '| 라이선스 | 개수 |',
  '| --- | ---: |',
  ...Object.entries(byLicense)
    .sort((a, b) => b[1] - a[1])
    .map(([l, c]) => `| ${l} | ${c} |`),
  '',
  '## ⚠️ 카피레프트 계열',
  '',
  copyleft.length === 0
    ? '없음 (GPL/LGPL/AGPL/MPL/EUPL 등 미검출).'
    : [
        '| 패키지 | 버전 | 라이선스 | repository |',
        '| --- | --- | --- | --- |',
        ...copyleft.map((e) => `| ${e.name} | ${e.version} | ${e.license} | ${e.repository} |`),
      ].join('\n'),
  '',
  '## 전체 목록',
  '',
  '| 패키지 | 버전 | 라이선스 | repository |',
  '| --- | --- | --- | --- |',
  ...entries.map((e) => `| ${e.name} | ${e.version} | ${e.license} | ${e.repository} |`),
  '',
].join('\n');

mkdirSync(resolve(REPO_ROOT, 'docs'), { recursive: true });
writeFileSync(resolve(REPO_ROOT, 'docs/oss-licenses.md'), md);

console.log(`[gen-oss-licenses] ${entries.length} packages → apps/web/lib/oss/oss-licenses.json, docs/oss-licenses.md`);
console.log(`[gen-oss-licenses] 카피레프트 계열: ${copyleft.length}개 ${copyleft.map((e) => e.name + '(' + e.license + ')').join(', ')}`);
