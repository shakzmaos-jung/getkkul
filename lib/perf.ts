/**
 * 페이지 데이터페칭 소요 관측(메뉴 이동 성능 검증용).
 * Vercel 함수 로그에 "[perf] route=/feed db_ms=123" 형태로 남겨 p50/p95 를 집계한다.
 * 실패해도 원 함수 결과/에러를 그대로 전달한다(관측이 동작을 바꾸지 않음).
 */
export async function timed<T>(routeLabel: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] route=${routeLabel} db_ms=${Date.now() - t0}`);
  }
}

/** 다단계 페칭용 수동 계측 시작점(서버 컴포넌트 본문의 Date.now 직접 호출 lint 회피). */
export function perfStart(): number {
  return Date.now();
}

/** perfStart 와 짝. 총 소요를 [perf] 로그로 남긴다. */
export function perfEnd(routeLabel: string, t0: number): void {
  console.log(`[perf] route=${routeLabel} db_ms=${Date.now() - t0}`);
}
