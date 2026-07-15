# ADR-0012 — 버전 관리 정책: SemVer + CHANGELOG + git 태그

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-11
- **결정자**: Chess (운영자)
- **관련**: `package.json`(단일 소스), `CHANGELOG.md`, `next.config.ts`(버전 주입), `components/layout/SideMenu.tsx`(푸터 표시)

## 맥락

앱 버전(`v0.1.0`)이 규칙 없이 붙은 임의값이었다. 버전 정의·증가 기준·릴리스 이력 관리가 없어, (1) 사용자에게 표시되는 버전의 의미가 불명확하고 (2) 향후 팀 합류 시 변경 이력을 공유할 아카이브가 없다. 개인 프로덕트지만 프로덕트 관리 관점의 이력 보존이 필요.

## 결정

**유의적 버전(SemVer) `MAJOR.MINOR.PATCH`** 를 채택하고, `CHANGELOG.md` 와 git 태그로 릴리스 이력을 아카이브한다.

- **증가 기준**
  - **PATCH**: 버그 수정, 문구·스타일 조정 등 동작 영향 없는 변경.
  - **MINOR**: 하위호환 사용자 대면 기능 추가(예: 21:30 발송 슬롯, 친구초대 메뉴).
  - **MAJOR**: 파괴적 변경·대개편(예: 소스 확장 v2, 데이터/UX 대전환).
- **0.x 단계**: PRD v1 개발 중을 의미. **PRD v1 범위 완성·안정 운영 시 `1.0.0`** 으로 승격.
- **단일 소스**: `package.json.version`. `next.config.ts` 가 빌드 시 `NEXT_PUBLIC_APP_VERSION` 로 주입 → 사이드 메뉴 푸터가 자동 표시(하드코딩 금지, ADR-0011 연장).
- **이력 관리(릴리스마다)**:
  1. 사용자 대면 변경이 있는 PR 에서 `package.json` 버전을 규칙대로 bump.
  2. 같은 PR 에서 `CHANGELOG.md` 에 `[X.Y.Z] - YYYY-MM-DD` 섹션 추가(Added/Changed/Fixed/Removed). "Keep a Changelog" 형식.
  3. main 머지 후 `git tag -a vX.Y.Z -m "..." && git push --tags`. 필요 시 GitHub Releases 로 확장.
  4. 같은 PR 에서 `apps/admin/lib/versions/data.ts` 최상단에 신규 엔트리 추가 — 요약 + 3단계 설명(개발자/비개발자/사용자영향) + `prs`(PR 번호) + 실제 머지날짜. getkkul-admin '버전 히스토리' 메뉴가 이를 테이블로 노출한다(무결성 테스트가 정렬·필수필드·타입 델타 강제).

## 근거

CHANGELOG(마크다운 파일, 릴리스당 수분)와 git 태그(명령 한 줄)는 공수가 매우 낮으면서 "변경 이력 아카이브 → 향후 팀 공유" 목적을 충족한다. 추가 빌드 배선이 없다(버전 주입은 이미 존재).

## 영향

- 순수 리팩터·문서·인프라 변경(사용자 표시 무관)은 버전 bump 불필요(선택적 PATCH).
- `v0.1.0` 소급 태그는 생략(이력은 `[0.1.0]` CHANGELOG 항목으로 대체). 태깅은 `v0.2.0` 부터.
