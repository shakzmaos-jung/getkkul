/**
 * 멤버십 콘텐츠 컷오프.
 *
 * 멤버십 정책은 2026-07-10 KST 에 출시됐고, 조회 하한(published_at >= 회원 가입시점)상
 * 이 날짜 이전에 유튜브에 업로드된 콘텐츠는 어떤 회원도 볼 수 없다(최초 가입 2026-07-10 22:32 KST).
 * 따라서 파이프라인(감지·전사·요약)은 컷오프 이전 콘텐츠를 처리하지 않는다 — 낭비 방지.
 *
 * 값 = KST 2026-07-10 00:00 = UTC 2026-07-09 15:00. (최초 가입보다 이르러 조회 가능분은 절대 제외 안 됨.)
 * published_at 이 NULL(라이브/예정 등 미상)인 것은 '오래된 것'이 아니므로 제외하지 않는다.
 */
export const CONTENT_CUTOFF_PUBLISHED_AT = '2026-07-09T15:00:00.000Z';

/** JS 비교용 epoch(ms). detect 등 클라이언트 필터에서 사용. */
export const CONTENT_CUTOFF_MS = Date.parse(CONTENT_CUTOFF_PUBLISHED_AT);
