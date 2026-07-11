import AppHeader from '@/components/layout/AppHeader';
import ossLicenses from '@/lib/oss/oss-licenses.json';

interface OssLicense {
  name: string;
  version: string;
  license: string;
  repository: string;
  publisher: string;
  licenseText: string;
}

// 데이터는 `npm run gen:oss-licenses` 로 재생성(수작업 하드코딩 아님).
const LICENSES = ossLicenses as OssLicense[];

/** 단일 SPDX 식별자면 전문 링크 생성(복합/별표 라이선스는 링크 생략). */
function spdxUrl(license: string): string | null {
  const id = license.replace(/\*$/, '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(id) ? `https://spdx.org/licenses/${id}.html` : null;
}

export const metadata = { title: '오픈소스 라이선스' };

/** 겟꿀이 사용하는 오픈소스 라이선스 고지(자동 생성 데이터 기반). 라이트/다크 대응, 긴 목록 스크롤. */
export default function LicensesPage() {
  const counts: Record<string, number> = {};
  for (const l of LICENSES) counts[l.license] = (counts[l.license] ?? 0) + 1;
  const summary = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          겟꿀은 아래 오픈소스 소프트웨어를 사용하며, 각 라이선스와 저작권 고지를 존중합니다.
        </p>

        {/* 라이선스별 요약 */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {summary.map(([l, c]) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {l} <span className="font-semibold text-foreground">{c}</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">총 {LICENSES.length}개 프로덕션 의존성</p>

        {/* 패키지 목록 */}
        <ul className="mt-6 flex flex-col gap-3">
          {LICENSES.map((l) => {
            const spdx = spdxUrl(l.license);
            return (
              <li key={`${l.name}@${l.version}`} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <div className="min-w-0">
                    <span className="break-all text-sm font-semibold text-foreground">{l.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{l.version}</span>
                  </div>
                  <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {l.license}
                  </span>
                </div>

                {l.publisher && <p className="mt-1 text-xs text-muted-foreground">© {l.publisher}</p>}

                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {l.repository && (
                    <a
                      href={l.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      repository
                    </a>
                  )}
                  {spdx && (
                    <a href={spdx} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      라이선스 전문(SPDX)
                    </a>
                  )}
                </div>

                {l.licenseText.trim() && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
                      라이선스 원문 보기
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-foreground/80">
                      {l.licenseText}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
