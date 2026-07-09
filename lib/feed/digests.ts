/**
 * 피드 캘린더 집계와 콘텐츠 카드가 항상 같은 집합에서 나오도록 하는 선별 로직.
 * "다이제스트"의 정의 = 요약(ko)이 존재하는 done 영상. status='done' 이라도 요약이 없으면
 * 카드로 표시되지 않으므로 캘린더에서도 세지 않는다(숫자 불일치 방지).
 */

/** 요약이 있는 done 영상만 최신순으로 선별(상한 적용). 캘린더·카드의 단일 진실 공급원. */
export function selectSummarizedRows<T extends { id: string }>(
  doneRows: T[],
  hasSummary: (id: string) => boolean,
  limit: number,
): T[] {
  return doneRows.filter((r) => hasSummary(r.id)).slice(0, limit);
}

/** 선별된 영상 → (채널, KST 일자) 목록. 캘린더 일자별 집계가 카드와 1:1 로 일치하게 한다. */
export function toDigestDates(
  rows: { channel_id: string; published_at: string | null }[],
  toKstDate: (iso: string) => string,
): { c: string; d: string }[] {
  const out: { c: string; d: string }[] = [];
  for (const r of rows) {
    if (!r.published_at) continue;
    out.push({ c: r.channel_id, d: toKstDate(r.published_at) });
  }
  return out;
}
