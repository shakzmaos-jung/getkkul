# SYNC-LOG — SOT↔코드 동기화 내역 (getkkul 관제 어드민)

> **성격**: append-only 감사 추적. 구현이 SOT(PRD/SSR/EXECUTION-PLAN)와 갈릴 때마다 `spec-sync` 서브에이전트(EXECUTION-PLAN §10)가 여기에 엔트리를 추가한다. **엔트리를 지우거나 수정하지 말 것**(정정은 새 엔트리로).
> **목적**: "PRD→SSR→SDD→TDD→배포를 한 큐로 0→1" 개발에서 문서와 구현이 어떻게·왜 달라졌는지의 완전한 기록. 이 로그의 밀도·해상도가 실험 품질의 지표다.

## 기록 규칙
- **트리거**: 각 마일스톤 종료 시(Stop hook) 자동. + 스펙 참조 파일 변경 시(PostToolUse) "미검토 변경" 플래그.
- **분류 두 갈래**:
  - `결정(intentional)` — 더 나은 설계 판단 → **ADR 생성(ADR-A7+) + 해당 SOT 갱신** 후 기록.
  - `드리프트(unintended)` — 근거 없이 스펙과 다름 → **코드 수정 또는 스펙 정정** 후 기록.
- **필수 필드**: 일시(UTC) · 마일스톤 · 영향 REQ/AC · 어긋난 내용 · 분류 · 조치(ADR/스펙/코드) · 커밋 SHA.
- 마일스톤 릴리스 시 해당 구간 요약을 CHANGELOG / PR 본문에 링크.

## 엔트리 형식
```
### [YYYY-MM-DDTHH:MMZ] Mx · REQ-XX-n
- 분류: 결정 | 드리프트
- 어긋난 내용: (SOT는 A라고 했으나 구현은 B)
- 원인/근거: (왜 갈렸는가)
- 조치: ADR-A? 생성 | SSR §… 갱신 | 코드 … 수정
- 트레이서빌리티: (REQ↔AC↔테스트↔구현 갱신 여부)
- 커밋: <sha>
```

---

## 로그

### [예시 · 2026-07-1?T??:??Z] M4 · REQ-CO-1 / AC-CO-1a
- 분류: 결정(intentional)
- 어긋난 내용: SSR은 비용 USD를 "가격표 × summarize stats 토큰"으로 명시했으나, 구현 중 프롬프트 캐시 토큰이 별도 계상됨을 발견.
- 원인/근거: gpt-5-nano 응답의 cached_tokens를 반영해야 실비용과 일치.
- 조치: ADR-A7 생성(캐시 토큰 단가 반영) · SSR AC-CO-1a 갱신 · `pricing/llm-prices.ts`에 cached 단가 추가.
- 트레이서빌리티: cost.test에 cached-token 케이스 추가.
- 커밋: (예시)

<!-- 실제 엔트리는 spec-sync가 여기 아래로 append -->

### [2026-07-12T06:15Z] M0 · (모노레포 구조)
- 분류: 결정(intentional)
- 어긋난 내용: §M0 산출물은 `packages/db·domain`에 supabase 클라이언트·순수로직을 **이관**한다고 명시했으나, 구현은 packages를 **빈 스캐폴드**로만 두고 앱을 `apps/web`로 verbatim 이동했다(내부 import 0). 증거: `packages/*/src/index.ts`(빈 export), 커밋 a5fef5f.
- 원인/근거: M0 불변조건 "회귀 0"과 상충. 이관은 `createPipelineClient`(비-server-only)/`admin.ts`(server-only) 분리(13모듈+3스크립트 의존)를 흔들어 라이브 파이프라인 회귀 위험. 또 domain/pricing은 M4 신규, ui/Linear 토큰은 M1 신규라 원래 추출 대상 아님.
- 조치: **ADR-A7 생성**(`docs/adr/A7-monorepo-packages-skeleton-first.md`) · **EXECUTION-PLAN §M0 갱신**(스켈레톤 우선 명시). 추출은 소비 마일스톤에서 JIT.
- 트레이서빌리티: M0는 SSR 트레이스 표에 REQ 없음(표는 M1부터). 본 결정은 ADR-A7로 등록.
- 커밋: a5fef5f (구현) · (본 엔트리 = spec-sync 활성화 커밋)

### [2026-07-12T06:15Z] M0 · REQ-SY-1 / AC-SY-1a (Sync 훅 기법)
- 분류: 결정(intentional) — 스펙 정정
- 어긋난 내용: §10.3은 Stop hook 무한루프 방지를 `stop_hook_active` 가드로 명시했으나, 현행 Claude Code(v2.1.205+)에 그 필드는 **존재하지 않는다**. 또 Stop hook은 서브에이전트를 직접 스폰할 수 없다.
- 원인/근거: 문서 작성 시점 이후 훅 스펙 변경(공식 docs 확인).
- 조치: **self-clearing 게이트**로 구현 — tip 커밋이 `(M<n>)`인데 SYNC-LOG에 `spec-sync: M<n> done` 마커가 없으면 동작, 마커가 append되면 자동 통과(무한루프 불가). Stop hook은 spec-sync 서브에이전트 실행을 안내(직접 스폰 불가). **사용자 결정(2026-07-12): 기본은 리마인더(비차단, `SPEC_SYNC_ENFORCE=0`) — 수동/승인 프로세스로 운영하고, 마일스톤마다 자동 강제(`=1`) 전환 여부를 사용자에게 묻는다.** §10.3의 `stop_hook_active` 문구·강제 전제는 후속 갱신 권고.
- 트레이서빌리티: `.claude/hooks/spec-sync-gate.sh`·`spec-sync-flag.sh`·`.claude/settings.json`·`.claude/agents/spec-sync.md`. (테스트: 훅 4종 수동 검증 — block/pass/flag scope.)
- 커밋: (본 엔트리 = spec-sync 활성화 커밋)

### [2026-07-12T06:15Z] M0 · (버전 표기)
- 분류: 드리프트(unintended, 경미)
- 어긋난 내용: 어드민 SOT(PRD/SSR/EXECUTION-PLAN) 헤더가 "v0.6.0 기준"이라 적혀 있으나 리포는 이미 **v0.7.0**(PR #83·#84 등 크레딧/파이프라인 작업으로 진행).
- 원인/근거: SOT는 작성 시점 스냅샷. 표기가 뒤처짐(기능 영향 없음).
- 조치: 스냅샷 성격이라 정정은 선택적. 본 로그로 기록만 남김. 이후 어드민 SOT 개정 시 헤더 갱신 권고.
- 트레이서빌리티: 해당 없음.
- 커밋: (기록만)

<!-- spec-sync: M0 done @ a5fef5f -->

### [2026-07-12T08:17Z] M1 · REQ-AU-2 / AC-AU-2c + REQ-AU-3 (초대 범위)
- 분류: 결정(intentional)
- 어긋난 내용: SSR 트레이스는 AC-AU-2c(master만 초대/취소)·REQ-AU-3(초대 플로우)를 M1에 매핑했으나, 구현은 **역할 게이트(master 전용 액션 차단)만** 포함하고 **초대 생성 플로우(admin_invitations)는 후속으로 미룸**. 증거: `apps/admin/lib/auth/access.ts`(hasRole/requiredRole), 초대 UI/테이블 없음.
- 원인/근거: 사용자 결정(2026-07-12) — 초기 admin 은 master(Chess) 단독이라 sub_master 초대 불요. SSR §5.1(admin_users만)과도 일치. admin_invitations 는 §5.1 범위 밖 추가라 신중히.
- 조치: AC-AU-2c 의 "역할 인가"는 M1 충족(access.test), 초대 플로우(REQ-AU-3)는 후속 마일스톤(admin_invitations 스키마 도입 시 에스컬레이션).
- 트레이서빌리티: `apps/admin/lib/auth/access.test.ts` — 역할 게이트(master⊇sub_master, requiredRole=master→403) 검증.
- 커밋: (M1, 본 PR)

### [2026-07-12T08:17Z] M1 · REQ-AU-2 (admin_users 조회 경로)
- 분류: 결정(intentional) — 설계 명료화
- 어긋난 내용: 미들웨어가 admin_users 소속을 **본인 세션(anon) self-read**(RLS 정책)로 조회한다. service_role 미사용.
- 원인/근거: RLS self-read(user_id=auth.uid())가 본인 행만 허용 → 최소권한. service_role 은 관제 read-layer RPC(M2+)용이며 미들웨어엔 두지 않음(ADR-A2 일치, IDOR 표면 축소).
- 조치: 없음(스펙 의도에 부합, 명료화 기록).
- 트레이서빌리티: `apps/admin/lib/supabase/session.ts`.
- 커밋: (M1, 본 PR)

### [2026-07-12T08:17Z] M1 · (어드민 DB 타입)
- 분류: 결정(intentional)
- 어긋난 내용: 어드민이 전체 generated database.types 대신 **admin_users 최소 타입**만 둠(`apps/admin/lib/database.types.ts`).
- 원인/근거: 전략 A(skeleton-first, ADR-A7). M1 은 admin_users 만 조회. 전체 타입·packages/db 통합은 M2 관제 RPC 도입 시 JIT.
- 조치: M2 에서 generated types 생성, 필요 시 packages/db 로 통합.
- 커밋: (M1, 본 PR)

### [2026-07-12T08:17Z] M1 · AC-DS-2a (컴포넌트 프리미티브)
- 분류: 드리프트(경미)
- 어긋난 내용: AC-DS-2a 는 카드/버튼/배지 컴포넌트 스펙 스냅샷을 언급하나, M1 은 **토큰 스냅샷(registry.test) + 셸에서의 토큰 유틸 사용**으로 충족하고 공식 Card/Button/Badge 프리미티브+스냅샷은 미구현.
- 원인/근거: M1 셸은 빈 상태 중심이라 프리미티브 수요가 적음. 토큰 계층(AC-DS-1a: raw 값 대신 토큰 유틸 참조)은 충족.
- 조치: 공용 컴포넌트 프리미티브(+스냅샷)는 위젯이 실제 필요한 M2+에서 packages/ui 에 추가.
- 커밋: (M1, 본 PR)

<!-- spec-sync: M1 done @ feat/m1-admin-shell-auth -->

### [2026-07-12T08:59Z] M2 · REQ-OV-1 / AC-OV-1b (KPI 정의·측정성)
- 분류: 결정(intentional)
- 어긋난 내용: AC-OV-1b는 KPI 6종을 명시하나, 실데이터로 측정 가능한 것은 3종(서비스상태·오늘 배치성공률·활성구독자)뿐. 나머지 3종은 데이터 부재 → **미연동 빈 상태**로 표시(가짜 0 금지, REQ-ST-1). 증거: 데이터 인벤토리(deliveries 오픈추적 없음, 가격표/예산 없음(M4), 인시던트 엔티티 없음(M7)).
- 원인/근거: 사용자 결정(2026-07-12). ④이메일 오픈율=추적 미도입(영구 불가), ⑤LLM비용=M4 가격표/예산, ⑥열린 인시던트=M7. 6칸 레이아웃은 유지하되 정직하게 미연동 안내.
- 조치: `get_admin_overview` 는 health(기존 pipeline_health_snapshot 재사용)+구독자만 반환. ⑤는 M4, ⑥은 M7에서 채움.
- 트레이서빌리티: `apps/admin/lib/overview/derive.test.ts`(9), page 6칸 렌더.
- 커밋: (M2, 본 PR)

### [2026-07-12T08:59Z] M2 · AC-OV-1a/1b (지표 정의)
- 분류: 결정(intentional) — 스펙 공백 확정
- 어긋난 내용: 스펙이 열어둔 정의를 확정 — **오늘 배치 성공률 = 정상 단계/4**(throughput 아님), **활성 구독자 = 안 멈춘 활성 구독 ≥1 인 사람**(사용자 결정), **순증 = 신규 가입만**(이탈은 계정삭제 cascade로 추적 불가). 서비스 상태 3단계: 위험=파이프라인 정지/쿠키만료/발송지속실패, 주의=실패율>5%(단계 하나라도)·백로그·감지실패 등, 정상=신호 없음.
- 원인/근거: 데이터 제약(창 불일치·이탈 미추적) + AC-OV-1a("실패율>5% 또는 백로그 → 주의") 준수. 임계는 기존 health-check.ts(60분·10건)와 정합.
- 조치: 로직은 순수 TS(derive.ts)로 테스트. 라이브 데이터 스모크로 검증(정상·100%·구독자5).
- 트레이서빌리티: `apps/admin/lib/overview/derive.ts`·`derive.test.ts`, RPC `get_admin_overview`.
- 커밋: (M2, 본 PR)

### [2026-07-12T08:59Z] M2 · (service_role 도입)
- 분류: 결정(intentional) — 예정된 경계
- 어긋난 내용: 어드민에 service_role 클라이언트 최초 도입(`apps/admin/lib/supabase/admin.ts`, server-only). 관제 read-layer(전체 사용자 집계)엔 필수.
- 원인/근거: ADR-A2(service_role는 admin 배포 서버 전용). M1 인증 게이트는 anon self-read였고, M2 관제 데이터는 service_role RPC 필요.
- 조치: server-only 가드 + `.env.example` 에 SUPABASE_SERVICE_ROLE_KEY 문서화(NEXT_PUBLIC 금지). 어드민 최소 DB 타입에 get_admin_overview 추가(전체 generated 는 필요 시 JIT).
- 커밋: (M2, 본 PR)

<!-- spec-sync: M2 done @ feat/m2-overview -->

### [2026-07-12T09:56Z] M3 · §0.2 (개발 방법론 전환 — ultracode)
- 분류: 결정(intentional) — 사용자 명시 지시
- 어긋난 내용: SOT §0.2 #4는 "Agent Teams 미사용 · 단일 세션 순차 진행"을 명시하나, M3는 **ultracode(다중 에이전트 Workflow)**로 개발 — 그라운딩(4 탐색+종합, 5에이전트) + 적대적 검증(4렌즈+재검증, 15에이전트).
- 원인/근거: 사용자가 "M3는 ultracode 모드로 전환해서 진행해보기"(2026-07-12) 명시 지시. 실험. HOTL 하드 게이트(RPC 스키마 승인)는 ultracode 안에서도 유지.
- 조치: SOT §0.2의 "단일 세션 순차" 전제를 이 마일스톤 한정 예외로 기록. 지속 적용 시 §0.2 갱신 필요.
- 트레이서빌리티: 워크플로 2건(grounding·adversarial-review).
- 커밋: (M3, 본 PR)

### [2026-07-12T09:56Z] M3 · REQ-PI-1 (적대적 리뷰가 잡은 3건 수정)
- 분류: 드리프트(unintended) → 수정 완료
- 어긋난 내용/수정:
  1. **AC-PI-1c 발송 성공률**: deliverySuccessRate 계산·테스트했으나 UI에 미렌더(테스트가 거짓 확신) → deliverStageSubLabel 추출 + 렌더 + 회귀 테스트 추가.
  2. **채널 RPC 컷오프 불일치**: new/pending/failed는 컷오프 적용, summarized/processing은 미적용(요약 1685=전체 카운트) → 전 컬럼 (published>=cutoff OR null)로 통일(요약 80=대상집합). 파이프라인 실제 대상과 일치.
  3. **발송 ok 오탐**: 미실행(delivered=0,failures=0)에도 초록 → 중립(null)로 수정(타 단계와 대칭).
- 원인/근거: ultracode 적대적 검증(4렌즈)이 CI/타입/테스트가 못 잡은 결함 3건 확인. 리뷰 가치 입증.
- 조치: 코드 수정 + regression 테스트(deliverStageSubLabel) + RPC 재적용(라이브·리포).
- 트레이서빌리티: `apps/admin/lib/pipeline/derive.test.ts`(30 admin 테스트), 마이그레이션 2건 갱신.
- 커밋: (M3, 본 PR)

### [2026-07-12T09:56Z] M3 · AC-PI-1a/b + REQ-NFR-1 (정의·범위)
- 분류: 결정(intentional)
- 어긋난 내용: 정의 확정(사용자 승인) — 대기=status 'pending', p_date 기본=오늘 KST, 채널=구독된 채널만, 실패=영구 vs 재시도소진 분리. AC-PI-1a "membership-cutoff"는 발송(per-user) 개념이라 파이프라인 처리 뷰엔 content-cutoff(또는 null)만 적용. 발송 단계 소요시간은 pipeline_runs 미기록 → null(정직).
- 미이행(경미): REQ-NFR-1 "대량 테이블 서버 페이지네이션 25행"은 채널 33개라 전량 렌더(스크롤). 채널 증가 시 페이지네이션 도입 예정.
- 조치: 라이브 스모크 검증(발송 성공률·채널 합계). 페이지네이션은 후속.
- 트레이서빌리티: RPC get_pipeline_status·get_channel_processing, `lib/pipeline/*`, `app/(dashboard)/pipeline`.
- 커밋: (M3, 본 PR)

<!-- spec-sync: M3 done @ feat/m3-pipeline -->

### [2026-07-12T10:22Z] M4 · REQ-CO-1 / AC-CO-1a (가격표 · 비용 계산)
- 분류: 결정(intentional)
- 어긋난 내용: 가격표를 §5.4대로 **TS 파일**(`packages/domain/src/pricing/llm-prices.ts`)로 두고 USD는 **앱에서 계산**(가격표×토큰, 코드 배포 무관). RPC(get_cost_breakdown)는 원자료(일별 토큰·이메일·쿼터)만 반환. packages/domain 첫 실제 콘텐츠(ADR-A7 JIT 생성).
- 원인/근거: §5.4("가격 변동 시 이 파일만 수정"). 단가 gpt-5-nano input $0.20/output $1.25/cached $0.02 per 1M — 사용자 확인(2026-07-12). 라이브 검증: 30일 $0.59, 비율 7.6:1 우수.
- 조치: computeUsd·ratioBadge를 @getkkul/domain에 두고 admin이 소비(transpilePackages). Overview ⑤ 미연동→실측 USD 연동(M2 약속 이행).
- 트레이서빌리티: `packages/domain/.../llm-prices.test.ts`(6) + `apps/admin/lib/cost/derive.test.ts`(4).
- 커밋: (M4, 본 PR)

### [2026-07-12T10:22Z] M4 · AC-CO-1a (측정 한계 2건)
- 분류: 드리프트(unintended, 데이터 제약) → 정직 표기
- 어긋난 내용: AC-CO-1a "일/**모드별** USD" 중 **모드별(짧게/보통/길게) 분리 불가** — 토큰이 요약 배치 단위(pipeline_runs.stats)로만 기록. → 일별 총 USD만 제공, 모드별은 화면에 "미제공" 명시. 또 **캐시 토큰 미계측**(stats에 cached_tokens 없음) → USD는 prompt×0.20+completion×1.25(캐시 반영 안 됨). 가격표엔 cached 단가 보유.
- 원인/근거: 기존 계측(summarize stats)의 구조. SYNC-LOG 예시 엔트리(cached-token)가 예견한 지점.
- 조치: 정직 표기(page 하단 안내). 모드별·캐시 계측은 summarize stats 확장 시 후속(스키마 변경 에스컬레이션 대상).
- 커밋: (M4, 본 PR)

### [2026-07-12T10:22Z] M4 · REQ-CO-1 (예산 생략)
- 분류: 결정(intentional)
- 어긋난 내용: AC-CO-1의 "예산 대비 소진"을 생략 — 예산 설정 없이 실지출(USD·토큰)만 표시.
- 원인/근거: 사용자 결정(2026-07-12, 개인 학습 프로젝트·저비용). 예산 config 부재.
- 조치: 예산 도입 시 후속. YouTube 쿼터는 cap 대비(search_api_usage) 표시.
- 커밋: (M4, 본 PR)

<!-- spec-sync: M4 done @ feat/m4-cost -->

### [2026-07-12T10:41Z] M5 · AC-GR-1 (오픈 기반 지표 proxy · 이탈 미추적)
- 분류: 결정(intentional) + 데이터 제약
- 어긋난 내용: AC "활성화율(첫 다이제스트 오픈)"·"코호트 리텐션"은 오픈 추적 부재로 직접 측정 불가 → **활성화율=발송 받음 기준**, **리텐션=구독 유지 기준 proxy**(사용자 결정 2026-07-12, 화면에 라벨 명시). "이탈(순감)"은 계정 삭제 cascade로 흔적 없음 → **미추적**(순증=신규 가입만).
- 원인/근거: 오픈/재방문 계측 부재(M2 이메일오픈율과 동일 제약). 소규모 신뢰그룹.
- 조치: proxy 정직 표기. 오픈 추적 도입 시 실지표로 대체(후속).
- 트레이서빌리티: `apps/admin/lib/growth/derive.test.ts`, RPC get_growth_metrics.
- 커밋: (M5, 본 PR)

### [2026-07-12T10:41Z] M5 · AC-GR-1a (레퍼럴 글로벌 집계)
- 분류: 결정(intentional)
- 어긋난 내용: AC-GR-1a는 `get_referral_progress` 재사용을 명시하나 그 함수는 **per-user(SECURITY INVOKER)**라 글로벌 관제엔 부적합. 킬스위치 소진율은 **referral_program(total_issued/budget_cap) + 크레딧 원장** 집계로 산출.
- 원인/근거: 글로벌 집계 필요. AC-GR-1a "크레딧 원장 재사용" 취지는 충족(중복 로직 없음).
- 조치: get_growth_metrics 내 referral_program·referrals 집계. per-user 진척은 M8 운영데이터 후보.
- 커밋: (M5, 본 PR)

### [2026-07-12T10:41Z] M5 · AC-GR-1b (가치 통계 재사용 — 미포함)
- 분류: 드리프트(unintended) → 후속
- 어긋난 내용: AC-GR-1b "가치 통계(get_month_value_stats/computeValueSummary) 재사용"을 M5 그로스 화면에 **미포함**. 그로스 지표(구독자·퍼널·리텐션·레퍼럴)에 집중.
- 원인/근거: 가치 통계는 per-user reading value(get_month_value_stats는 auth.uid 기반)라 글로벌화하려면 computeValueSummary(apps/web/lib/summary/reading.ts)를 packages/domain으로 추출 후 글로벌 RPC 필요. 범위·중복금지 판단으로 후속.
- 조치: **후속** — computeValueSummary를 packages/domain으로 JIT 추출(중복금지) + 글로벌 가치 집계. 사용자 확인 필요.
- 트레이서빌리티: 미구현(후속 등록).
- 커밋: (M5, 본 PR)

<!-- spec-sync: M5 done @ feat/m5-growth -->






