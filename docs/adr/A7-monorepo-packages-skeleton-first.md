# ADR-A7 — 모노레포 패키지: 스켈레톤 우선(JIT 추출)

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-12
- **결정자**: Chess (운영자) — Plan Mode 승인
- **기반**: `docs/admin/EXECUTION-PLAN.md` §M0·§9 #1, 루트 CLAUDE.md 에스컬레이션 정책
- **계열**: 어드민 아키텍처 ADR(A1–A6는 EXECUTION-PLAN §2). A7은 첫 신규 파일 ADR.

## 맥락

EXECUTION-PLAN §M0 산출물 문구는 `packages/db`(supabase 클라이언트+`database.types`)·`packages/domain`(순수로직)에 기존 코드를 **이관**한다고 적혀 있다. 그러나 그 위 **불변조건은 "회귀 0"**(기존 315+ 테스트 green + 라이브 프로덕션 파이프라인 무손상)이다. 이 둘은 상충한다:

- 실제 이관은 `apps/web` 전역의 import 경로를 재배선한다. 특히 `createPipelineClient`(비-`server-only`)와 `admin.ts`(`server-only`)의 **의도적 분리**는 13개 모듈 + 3개 스크립트가 의존하는 델리킷한 배선이라, 대규모 일괄 이동은 이 분리를 조용히 깨 **라이브 파이프라인을 회귀**시킬 위험이 크다.
- 또한 `packages/domain`의 `pricing/llm-prices.ts`는 M4 **신규 생성**(추출 아님), `packages/ui`의 Linear 토큰은 M1 **신규 작성**(web의 Geist 테마와 무관)이라, 두 패키지는 원래 "추출" 대상이 아니었다.

## 결정

**전략 A — 스켈레톤 우선.**
- 앱 전체를 `apps/web`로 **verbatim 이동**(내부 import 0건 변경, `@/*` 별칭·설정 동반).
- `packages/{db,domain,ui,config}`·`apps/admin`은 M0에 **빈 스캐폴드**로만 생성.
- 실제 공용 코드 추출은 소비자(admin)가 필요로 할 때 **마일스톤별 JIT + 실패테스트 우선(TDD)**.
- **Turborepo 미도입**(순수 npm workspaces, 루트 위임 스크립트). 규모 증가 시 재검토.

## 결과

- **회귀 0 달성**: 테스트 331/331 green(이동 전=후), lint·typecheck·build green, GitHub CI green(워크플로 무변경 — 루트 위임), 라이브 파이프라인 정상(pipeline-check 스모크 확인).
- 최종 아키텍처는 §M0 의도와 **동일**(패키지는 마일스톤 진행하며 채움). TDD-per-AC 원칙에 오히려 더 충실.
- EXECUTION-PLAN §M0의 "이관" 문구는 본 ADR로 "빈 스캐폴드 + JIT 추출"로 갱신한다.
- 트레이드오프: 공유룸이 한동안 비어 있음(수용). 각 추출은 소비 마일스톤에서 실패테스트로 검증.
