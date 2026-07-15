// 버전 히스토리 엔트리 타입. date 는 실제 머지날짜(KST). prs 빈 배열이면 PR 링크 없음(베이스라인).
export type VersionType = 'major' | 'minor' | 'patch' | 'baseline';

export type VersionEntry = {
  version: string; // "0.12.0"
  date: string; // "2026-07-15"
  type: VersionType;
  prs: number[]; // [117]
  summary: string; // 개략 요약(한 줄)
  dev: string; // 개발자 설명(기술)
  nonDev: string; // 비개발자 설명(쉬운 말)
  userImpact: string; // 사용자 영향
};
