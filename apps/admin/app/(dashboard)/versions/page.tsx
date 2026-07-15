import { requireAdmin } from '@/lib/auth/require-admin';
import { VERSION_HISTORY, CURRENT_VERSION } from '@/lib/versions/data';
import { parseVersionQuery, filterVersions } from '@/lib/versions/derive';
import { VersionTable } from '@/components/versions/widgets';
import { FilterBar } from '@/components/versions/FilterBar';

export const dynamic = 'force-dynamic';

export default async function VersionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireAdmin(); // 심층 방어(미들웨어 우회 대비)
  } catch (e) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-crit/40 bg-crit/10 p-6">
          <h2 className="text-sm font-semibold text-crit">버전 히스토리를 불러오지 못했습니다</h2>
          <p className="mt-1.5 text-sm text-ink-subtle">
            {e instanceof Error ? e.message : '알 수 없는 오류'}
          </p>
        </div>
      </div>
    );
  }

  const q = parseVersionQuery(await searchParams);
  const rows = filterVersions(VERSION_HISTORY, q);

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-sm font-medium text-ink-muted">
        서비스 버전 히스토리 (현재 v{CURRENT_VERSION} · 총 {VERSION_HISTORY.length}개)
      </h2>
      <FilterBar type={q.type ?? ''} search={q.search ?? ''} />
      <VersionTable rows={rows} />
      <p className="text-xs text-ink-tertiary">
        단일소스: apps/web/package.json · CHANGELOG.md. 각 버전의 3단계 설명은 운영 참고용이며, PR 번호는 GitHub 로 이동합니다.
      </p>
    </div>
  );
}
