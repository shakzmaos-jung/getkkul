import snapshot from '@/data/security-snapshot.json';
import { buildSecurityChecks, type SecuritySnapshot } from '@/lib/security/checks';
import { SecurityCheckList } from '@/components/security/widgets';

export default function SecurityPage() {
  const snap = snapshot as SecuritySnapshot;
  const checks = buildSecurityChecks(snap);

  return (
    <div className="space-y-4 p-8">
      <SecurityCheckList checks={checks} />
      <p className="text-xs text-ink-tertiary">
        SCA 스냅샷 {new Date(snap.generatedAt).toLocaleString('ko-KR')} · `npm run gen:security`로
        갱신. npm audit·gitleaks는 CI(security.yml)에서 게이트로 실행됩니다.
      </p>
    </div>
  );
}
