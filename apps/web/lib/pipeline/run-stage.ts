/**
 * 파이프라인 단계 격리 (CLAUDE.md 격리·회복력 원칙, H6).
 *
 * 한 단계(exec)를 실행하되, 예외가 나면 잡아서 **후속 단계가 계속 실행되도록** 한다.
 * 실패한 단계 이름을 `failures` 에 누적하고, 안전한 `fallback` 값을 반환한다
 * (하위 로그/알림 임계값이 0 카운트로 오작동하지 않도록 stage 결과 shape 을 보존).
 *
 * `exec` 는 보통 `() => recordRun(supabase, kind, fn)` 형태로, 성공/실패는 여전히
 * pipeline_runs 에 단계별로 기록된다(관측성 유지). 이 함수는 그 위에서 "격리"만 담당한다.
 */
export async function runStage<T>(
  kind: string,
  exec: () => Promise<T>,
  fallback: T,
  failures: string[],
): Promise<T> {
  try {
    return await exec();
  } catch (e) {
    failures.push(kind);
    console.error(
      `[pipeline] '${kind}' 단계 실패(격리) — 후속 단계 계속: ${(e as Error).message}`,
    );
    return fallback;
  }
}
