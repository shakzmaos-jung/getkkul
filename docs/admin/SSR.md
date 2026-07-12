# SSR — getkkul 관제 어드민 (System/Software Requirements)

> **성격**: 검증 가능한 요구(REQ) + 수용 기준(AC). 각 AC는 최소 1개 테스트로 매핑된다(SDD→TDD). 제품 맥락은 `docs/admin/PRD.md`, 마일스톤은 `docs/admin/EXECUTION-PLAN.md`.
> **상속**: 루트 `CLAUDE.md` / `docs/SSR.md` / `docs/adr/*`. 보안·격리·버전 규약 상속.
> **버전**: v1.0

## 규약
- 데이터는 전부 실제 소스(기존 테이블/RPC 또는 신규 additive RPC). 하드코딩·목 금지.
- 타임스탬프 UTC 저장, 표시·집계는 KST 변환(상속).
- 어드민은 read-layer. 신규 DB 객체는 최소·additive·`SECURITY DEFINER`(service_role).

---

## A. 디자인 시스템 (Design System)
- **REQ-DS-1** 시맨틱 디자인 토큰 레이어(색·타이포·라운드·스페이싱)를 두고 컴포넌트는 raw 값을 직접 쓰지 않는다.
  - **AC-DS-1a** 컴포넌트 스타일에 하드코딩 hex/px 색상이 없다(토큰 var 참조). lint/grep 규칙으로 검증.
- **REQ-DS-2** 출시 테마 `linear`가 Linear 토큰(캔버스 #010102, surface 사다리, primary #5e6ad2, ink 사다리, 관제 시맨틱 ok/warn/crit, radius md8/lg12)을 구현한다. 엘리베이션은 그림자 대신 서피스+헤어라인.
  - **AC-DS-2a** `[data-theme="linear"]` 적용 시 카드=surface-1+1px hairline+radius-lg, 버튼=radius-md/패딩8×14, 배지=pill/surface-2. 스냅샷/토큰 테스트 통과.
- **REQ-DS-3** 멀티테마 아키텍처 내장, 출시는 `linear` 단일 등록. 테마 전환은 `<html data-theme>` 교체만으로, 컴포넌트 마크업 불변.
  - **AC-DS-3a** `theme-registry`에 `linear`만 등록. 새 테마 추가가 컴포넌트 수정 없이 토큰 블록+레지스트리 한 줄로 가능함을 문서/테스트로 확인.

## B. 인증 & 인가 (Auth)
- **REQ-AU-1** 기존 Supabase Auth(Google OAuth + 이메일 OTP) 재사용. 신규 인증 스택 없음.
- **REQ-AU-2** 어드민 접근은 `admin_users` 허용목록 + 역할(master/sub_master)로 서버사이드 이중 검증. 공개 셀프가입 없음.
  - **AC-AU-2a** 로그인했으나 `admin_users`에 없는 계정은 모든 /admin 경로에서 서버에서 차단(403/리다이렉트). 테스트 필수.
  - **AC-AU-2b** URL의 리소스 ID를 타인 것으로 치환해도 서버 인가가 차단(IDOR). 테스트 필수.
  - **AC-AU-2c** master만 초대/취소 가능. sub_master는 제한 권한.
- **REQ-AU-3** 초대 플로우: master가 초대 레코드 생성 → 초대자가 기존 Auth로 로그인 → 첫 로그인 시 서버가 대기 초대를 확인해 `admin_users` 승격.

## C. 관제 홈 (Overview)
- **REQ-OV-1** 서비스 신호등(정상/주의/위험) + 오늘 배치 스트립(감지→수집→요약→발송) + KPI 6종.
  - **AC-OV-1a** 배치 실패율 >5% 또는 요약 백로그 임계 초과 시 상태 ≥ 주의.
  - **AC-OV-1b** KPI 6종 = 서비스상태·오늘 배치 성공률·활성 구독자(순증)·이메일 오픈율·이번달 LLM비용(예산대비)·열린 인시던트. 6개 초과 금지.
  - **AC-OV-1c** 모든 값이 `get_admin_overview` 등 실제 RPC 기반.

## D. 서비스 헬스 (Health)
- **REQ-HE-1** 업타임/응답시간·에러 트래킹(신규 에러 타입)·구조화 로그 라이브테일·최근 배포.
  - **AC-HE-1a** 외부 소스(Sentry/업타임) 미연동 시 "미연동" 빈 상태 명시(가짜 수치 금지).
  - **AC-HE-1b** 라이브 로그는 파이프라인 로그 소스에서 최신 N건 폴링.

## E. 다이제스트 파이프라인 (Pipeline)
- **REQ-PI-1** 배치 타임라인(4단계 상태·소요·건수)·채널별 처리·재시도 큐·요약 리드타임.
  - **AC-PI-1a** 4단계 = detect(RSS)/acquire(자막)/summarize(gpt-5-nano 단일 3종)/deliver(4슬롯 07:30·11:30·17:30·21:30 KST). content-cutoff·membership-cutoff 반영된 실제 대상 건수.
  - **AC-PI-1b** 채널별 신규/요약/대기 = subscriptions ⋈ videos ⋈ summaries 집계.
  - **AC-PI-1c** 발송 성공률은 `deliveries`(status sent/failed, 멱등 UNIQUE(user_id,video_id)) 기준.

## F. 그로스 (Growth)
- **REQ-GR-1** 활성 구독자/순증/이탈·활성화율(첫 다이제스트 오픈)·코호트 리텐션·획득 퍼널·레퍼럴.
  - **AC-GR-1a** 레퍼럴은 기존 `get_referral_progress`/크레딧 원장 재사용. 킬스위치(예산 500만/1인 5만) 소진율 표시.
  - **AC-GR-1b** 가치 통계는 기존 `get_month_value_stats`/`computeValueSummary` 재사용(중복 로직 금지).

## G. 비용 · 쿼터 (Cost)
- **REQ-CO-1** LLM 비용(일/모드별 USD)·입력:출력 토큰 비율·YouTube 쿼터·이메일 발송량·예산 소진.
  - **AC-CO-1a** USD = 자체 계측 토큰(summarize stats, REQ-CO5) × 가격표 파일(§데이터). 모델 gpt-5-nano.
  - **AC-CO-1b** 입력:출력 비율 임계 배지 <10 우수 / 10–25 정상 / 25–50 조사 / >50 심각.
  - **AC-CO-1c** 이메일 발송/실패는 `deliveries` 기준(Gmail SMTP 바운스 웹훅 없음).

## H. 보안 (Security)
- **REQ-SE-1** 시크릿 스캔·의존성 취약점(SCA)·보안 헤더/SSL·IDOR 자가점검·이상 탐지 상태 요약.
  - **AC-SE-1a** SCA/시크릿은 CI 산출물(npm audit·gitleaks) 표시. 미구성 시 "미구성" 안내.
  - **AC-SE-1b** IDOR 자가점검 = "User A 로그인 → ID 치환 → User B 접근 차단" 통과 여부.

## I. 알림 · 인시던트 (Alerts)
- **REQ-AL-1** 알림 규칙(심각/보통)·인시던트 로그·포스트모템·상태페이지 링크.
  - **AC-AL-1a** 기존 운영자 알림(RSS 429·쿠키 만료·발송 실패 등, `OPERATOR_ALERT_EMAIL`)을 인시던트 소스로 수집·표시.
  - **AC-AL-1b** 규칙은 심각(즉시)·보통(다음)으로 분리 저장·표시.

## J. 운영 데이터 (Ops)
- **REQ-OP-1** 채널/구독자 조회·다이제스트 이력·재발송·파이프라인/발송 수동 실행.
  - **AC-OP-1a** 구독자 이메일 마스킹(기존 `lib/referral/mask` 재사용).
  - **AC-OP-1b** 수동 실행·재발송은 파괴적/부수효과 → 서버 권한 재검증 + 확인 다이얼로그 + 멱등 보장(중복 발송 없음).

---

## 데이터 객체 (신규, additive — 전부 에스컬레이션 후)
- **admin_users**: `(user_id uuid PK→auth.users, role text CHECK in ('master','sub_master'), invited_by uuid, created_at timestamptz default now())`. RLS: 쓰기 service_role, 조회 본인. master 1행 시드.
- **관제 read RPC** (`SECURITY DEFINER`, service_role): `get_admin_overview`·`get_pipeline_status`·`get_channel_processing`·`get_cost_breakdown`·`get_growth_metrics`·`get_incident_log`. 기존 함수(`get_content_feedback_metrics`·`count_period_digests`·`get_month_value_stats`·`get_referral_progress`) 재사용 우선.
- **LLM 가격표 파일**: `packages/domain/src/pricing/llm-prices.ts`(버전 관리, 코드와 분리). 모델→(input,output) 단가.
- **읽기 참조(기존)**: profiles·user_settings·subscriptions·videos·summaries·deliveries·membership(pause_reason)·membership_usage·content_feedback(prompt_version)·push_subscriptions·referral/credits·summarize stats.

## 보안 요구 (상속 + 확장)
- 사용자 스코프 테이블 RLS `user_id = auth.uid()`. 멱등은 DB unique로 강제.
- 시크릿 env 전용. `service_role`는 **어드민 배포 서버사이드에만**, `NEXT_PUBLIC_`에 절대 금지. 코드·로그·대화 평문 노출 금지.
- 어드민 세션 보안(단기 만료·secure 쿠키). MFA는 Google OAuth 상속(필요 시 Supabase MFA).

## env 매니페스트 (어드민 배포 전용)
`SUPABASE_URL`·`SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`(서버·admin 배포 전용)·`YOUTUBE_API_KEY`·`OPENAI_API_KEY`(선택)·`RESEND_API_KEY`/`GMAIL_*`(선택)·`SENTRY_*`(권장)·`ADMIN_SESSION_SECRET`. `.env.example`(키 이름만) 커밋 / 실제 값은 gitignore된 `.env.local`.

## 검증 & 완료 기준
- `npm run lint && npm run typecheck && npm run test && npm run build` 전부 green = 완료.
- 각 AC ↔ 최소 1 테스트. 실패는 self-correct.
- 기존 사용자 웹 회귀 0(270+ 테스트 green 유지).

## 에스컬레이션 (진행 전 정지·질의 — 상속)
DB 스키마 변경(`admin_users`·RPC) / 신규 의존성(차트 라이브러리 등) / 파괴적 작업(수동 실행·재발송) / 아키텍처 경계 변경(모노레포) / 비용 영향 / 스펙 모호·충돌. 상세 표는 `EXECUTION-PLAN.md §9`.

---

## 트레이서빌리티 (REQ ↔ AC ↔ 테스트 ↔ 코드/RPC) — v1.1
> spec-sync 드리프트 감지의 토대. 새 REQ/AC는 이 표에 테스트 ID·구현 지점과 함께 등록한다. **매핑 없이 병합 불가(CI 게이트).** 빈 칸 = 미구현/미검증(마일스톤 진행하며 채움).

| REQ | AC | 테스트(파일) | 구현(파일/RPC) | M |
|-----|----|-------------|----------------|---|
| REQ-DS-2/3 | AC-DS-2a/3a | packages/ui `theme/registry.test.ts` | packages/ui `theme/tokens.ts`·`registry.ts`·`theme.css`·`ThemeProvider.tsx` | M1 ✅ |
| REQ-AU-2 | AC-AU-2a/b/c | apps/admin `lib/auth/access.test.ts` | apps/admin `proxy.ts`·`lib/supabase/session.ts`·`lib/auth/access.ts`, admin_users(RLS) | M1 ✅ |
| REQ-OV-1 | AC-OV-1a/b/c | apps/admin `lib/overview/derive.test.ts` | `get_admin_overview` RPC, apps/admin `lib/overview/*`·`app/(dashboard)/overview` | M2 ✅ |
| REQ-PI-1 | AC-PI-1a/b/c | apps/admin `lib/pipeline/derive.test.ts` | `get_pipeline_status`·`get_channel_processing` RPC, apps/admin `lib/pipeline/*`·`app/(dashboard)/pipeline` | M3 ✅ |
| REQ-CO-1 | AC-CO-1a/b/c | packages/domain `llm-prices.test.ts` + apps/admin `lib/cost/derive.test.ts` | `get_cost_breakdown` RPC, `packages/domain/pricing/llm-prices.ts`, apps/admin `lib/cost/*`·`app/(dashboard)/cost` | M4 ✅ |
| REQ-GR-1 | AC-GR-1a (✅) / AC-GR-1b (후속) | apps/admin `lib/growth/derive.test.ts` | `get_growth_metrics` RPC(referral_program·크레딧 원장 재사용), apps/admin `lib/growth/*`·`app/(dashboard)/growth` | M5 ✅ (AC-GR-1b 가치통계 후속) |
| REQ-SE-1 | AC-SE-1a/b | apps/admin `lib/security/checks.test.ts` | `.github/workflows/security.yml`(npm audit·gitleaks), `scripts/gen-security-snapshot.mjs`, apps/admin `lib/security/*`·`app/(dashboard)/security` | M6 ✅ |
| REQ-AL-1 | AC-AL-1a/b (포스트모템 후속) | apps/admin `lib/incidents/derive.test.ts` | `get_incident_log` RPC(헬스·pipeline_runs 파생), apps/admin `lib/incidents/*`·`app/(dashboard)/alerts` | M7 ✅ (포스트모템·상태페이지 후속) |
| REQ-OP-1 | AC-OP-1a (✅) / AC-OP-1b (파괴적 액션 후속) | packages/domain `mask.test.ts` | `get_ops_data` RPC, apps/admin `lib/ops/*`·`app/(dashboard)/ops`, `@getkkul/domain` maskEmail | M8 ✅ (수동실행·재발송 후속) |
| REQ-ST-1 | 상태 렌더 | states.test | 각 위젯 empty/loading/error | M2+ |
| REQ-SY-1/2 | AC-SY-1a/b | sync.test | .claude/agents/spec-sync.md, SYNC-LOG.md | M1+ |

## 상태 · NFR · Sync 요구 (v1.1 증보)
- **REQ-ST-1** 모든 데이터 위젯은 empty/loading/error 3상태를 가진다(가짜 0 금지 · 스켈레톤 · 위젯 격리). AC: 3상태 각각 렌더 테스트.
- **REQ-NFR-1** 데이터 신선도(관제홈 60s · 비용/그로스 5m · 로그 실시간), 대량 테이블 **서버 페이지네이션(25행 커서)**, 어드민 자체 관측성(Sentry web/admin 분리). AC: 폴링 주기·페이지네이션 테스트.
- **REQ-NFR-2** 관제 홈 초기 TTI < 2.5s(집계 RPC·캐시). 클라이언트 대량 fetch 금지.
- **REQ-SY-1** spec-sync 서브에이전트 + Stop hook가 마일스톤 종료마다 드리프트 감지·분류·기록. **AC-SY-1a** 의도적 divergence 주입 시 SYNC-LOG 엔트리 생성 + Stop 차단. **AC-SY-1b** 의도된 결정은 ADR + SOT 갱신.
- **REQ-SY-2** 트레이서빌리티 매핑 없이 병합 불가(CI 게이트).

## 테스트 전략 (read-layer TDD)
- **RPC 계약 테스트**: 각 관제 RPC의 입출력 스키마·권한(service_role 전용) 검증(스냅샷).
- **인가/IDOR 테스트**: 비-admin 차단, ID 치환 차단(AC-AU-2a/b) — 서버 라우트·RLS 레벨.
- **집계 정확성**: 성공률·비용·리텐션은 고정 시드 데이터로 기대값 검증.
- **컴포넌트 상태**: empty/loading/error 스냅샷 + 테마 토큰 스냅샷.
- **모킹**: Supabase 클라이언트는 계약 레벨 목킹(실제 DB 미접속). 기존 vitest 관례 재사용.
- **회귀 가드**: 기존 apps/web 270+ 테스트 green 유지(모노레포 이관 후 경로 정상).
