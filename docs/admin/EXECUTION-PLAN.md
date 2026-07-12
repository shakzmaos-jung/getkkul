# getkkul 관제 어드민 — 0→1 실행 문서 (Execution Plan)

> **문서 성격**: 이 문서는 Claude Code 에이전트가 getkkul 관제 어드민(control-tower admin)을 0→1로 구현하기 위한 **단일 진실 공급원(SSOT)**이다. 기존 getkkul의 `CLAUDE.md`, `docs/PRD.md`, `docs/SSR.md`, `docs/adr/*`를 상속하며, 충돌 시 기존 컨스티튜션이 우선한다.
> **버전**: v1.1 (2026-07-12 기준) · **대상 리포**: `shakzmaos-jung/getkkul` (현재 v0.6.0)
> **v1.1 증보**: Sync 거버넌스(SOT↔코드 드리프트 동기화 · §10), 비기능 요구(§11), 상태 스펙(§12), DoR/DoD·접근성·배포(§13), 방법론 근거(§14). 신규 파일: `SYNC-LOG.md`, `.claude/agents/spec-sync.md`, `.claude/settings.json`.
> **작성 근거**: getkkul CLAUDE.md, package.json(Next 16.2.10 / React 19 / Tailwind v4 / Supabase / gpt-5-nano / Vitest), 커밋 #55–#79, Linear DESIGN.md 토큰.

---

## 0. 이 문서를 Claude Code에서 실행하는 법

### 0.1 방법론 (기존 getkkul 컨스티튜션 상속)
- **SDD → TDD**: 모든 작업은 이 문서의 SSR(§4)의 REQ + 수용기준(AC)에서 출발한다. AC를 **실패 테스트로 먼저 작성(Red) → 통과(Green) → 리팩터**. 사용자는 테스트를 쓰지 않는다. 각 AC는 최소 1개 테스트로 매핑된다.
- **HOTL (Human-on-the-loop)**: 사용자(Chess, master)는 상류 결정만 — 스펙 승인, 마일스톤 계획 승인, 최종 머지. 그 외는 검증 게이트(test·lint·typecheck·build·CI) 통과를 조건으로 자율 진행.
- **에스컬레이션(진행 전 정지·질의)**: 기존 CLAUDE.md 정책을 그대로 적용. 특히 이 프로젝트에서 반드시 정지하는 지점은 §9에 표로 정리했다. 요약하면 (1) DB 스키마 변경, (2) 신규 의존성 추가, (3) 파괴적/비가역 작업, (4) 아키텍처 경계 변경, (5) 비용 크게 영향, (6) 스펙 모호/충돌.

### 0.2 오케스트레이션 전략
1. **Plan Mode 먼저 (Opus · 엑스트라 · ultrathink)**: 착수 시 Plan Mode(터미널 `Shift+Tab`)로 이 문서를 읽고 M0 실행 계획을 먼저 수립·제시한다(코드 수정 전). 플랜 단계는 **Opus + effort 엑스트라 고정**으로 두고, 계획 프롬프트에 **`ultrathink` 키워드**를 넣어 최대 추론으로 돌린다.
   - 참고: `ultrathink`는 **슬래시 명령이 아니라 프롬프트에 넣는 키워드**다(v2.1.68에서 재도입, Claude Code 터미널 전용 — 웹/ API 미적용). effort의 지속 설정은 `/effort`(low/medium/high/max). "엑스트라 고정"은 `/effort`로 세션에 걸고, 개별 플랜 프롬프트마다 `ultrathink`를 덧붙이는 방식.
2. **M0는 단일 프롬프트에서 반자율**: 모노레포 전환 + 어드민 스캐폴드 + Linear 토큰 시스템 + 인증 게이트까지를 한 세션에서 진행하되, **스키마·구조 승인 지점에서 정지**(§9).
3. **이후 마일스톤은 HOTL 체크포인트로 끊는다**: 각 마일스톤 종료 시 게이트 통과 + 보고 → 사용자 승인 → 다음.
4. **Agent Teams 미사용**: 병렬 에이전트 팀은 쓰지 않는다. 모든 마일스톤은 **단일 세션에서 순차 진행**한다(팀 오케스트레이션 없음).
5. **모델 티어링**: 오케스트레이터 **Opus(엑스트라)** · 워커 **Opus(높음)** · 포매팅/정리 **Sonnet 5**. 실행 본체를 Opus로 유지하는 품질 우선 구성.

### 0.3 완료 기준(Definition of Done) — 모든 작업 공통
`npm run lint && npm run typecheck && npm run test && npm run build` 전부 green. 실패 시 사람을 부르지 말고 self-correct. 사용자 대면 변경이 있으면 SemVer bump + CHANGELOG(ADR-0012 규약).

---

## 1. 컨텍스트 & 목표

- **무엇**: getkkul 서비스를 **읽어서 관제**하는 별도 어드민 웹. 인프라 헬스·파이프라인·그로스·비용/쿼터·보안·알림을 한 곳에서 본다. "믿고 맡길 데브옵스 팀 같은 관제탑."
- **누구**: master(Chess) 1인 + 초대된 sub-master 소수(신뢰 그룹). 공개 아님.
- **왜 지금**: 기존 CLAUDE.md의 "범위 경계"에서 **운영자 어드민 대시보드는 v2/v3 항목으로 명시**돼 있었다. 이 문서가 그 항목을 정식 스펙으로 승격시킨다.
- **원칙**: 어드민은 **기존 스키마의 read-layer**다. 신규 DB 객체는 최소·additive(§5)로만. 기존 사용자 웹(apps/web)의 동작을 절대 회귀시키지 않는다(270+ 테스트 green 유지).

**Non-goals (이번 범위 아님)**: 사용자 웹 기능 변경, 결제/과금 로직 변경, 파이프라인 로직 변경(어드민은 관측·수동 트리거만), 외부 APM(Datadog 등) 도입.

---

## 2. 아키텍처 결정 (착수 시 `docs/adr/`에 기록)

| ID | 결정 | 요지 |
|----|------|------|
| **ADR-A1** | 모노레포 전환 | 기존 단일 앱을 `apps/web` + `apps/admin` + `packages/*`로. npm workspaces 기반. |
| **ADR-A2** | 어드민 별도 배포 · service_role 격리 | Vercel 두 프로젝트(web/admin). `service_role` 키는 **admin 프로젝트 env에만**. web은 미보유. |
| **ADR-A3** | 인증 = Supabase Auth 재사용 + `admin_users` | 새 인증 스택 안 만듦. Google OAuth + OTP 재사용 + 허용목록/역할 서버사이드 집행. |
| **ADR-A4** | LLM 비용 = 자체 계측 확장 | 기존 summarize stats(prompt/completion tokens·calls, REQ-CO5)에 가격표 기반 USD 환산·집계를 더한다. 게이트웨이·킬스위치 미도입. |
| **ADR-A5** | 디자인 = Linear 토큰 시스템 + 멀티테마 레이어 | Tailwind v4 `@theme` + `[data-theme]`. 출시는 `linear` 단일 테마, 테마 추가 기능은 아키텍처로 내장. |
| **ADR-A6** | 관제 데이터 = read-only + additive RPC | 기존 테이블/RPC는 조회만. 신규 RPC는 `SECURITY DEFINER`·service_role, 전부 additive. |

---

## 3. 디자인 시스템 — Linear (단일 테마 시작 · 멀티테마 아키텍처)

### 3.1 토큰 아키텍처 (Tailwind v4)
- **레이어**: 원시(raw) → 시맨틱(역할) → 컴포넌트. 컴포넌트는 **시맨틱 토큰만** 참조(raw 값 하드코딩 금지).
- **구현**: `packages/ui/src/theme.css`에 `@theme` 로 시맨틱 토큰을 CSS 변수로 정의하고, `[data-theme="linear"]`가 값을 세팅. `ThemeProvider`가 `<html data-theme>`를 제어.
- **멀티테마 요구(내장, 미노출)**: 테마 레지스트리(`themes/{id}.css` + `registry.ts`)를 만들되 **초기엔 `linear` 하나만 등록**. 새 테마 추가 = 토큰 블록 하나 추가(컴포넌트 수정 0). REQ-DS-3 참조.

### 3.2 Linear 토큰 값 (출시 테마 = `linear`)
> Linear 마케팅 표면은 다크 전용이나, 어드민은 **제품 UI**이므로 Linear 제품 표면 규칙을 준용: 다크 캔버스 + 4단 서피스 사다리 + 라벤더 프라이머리 + 헤어라인, **엘리베이션은 그림자 대신 서피스+헤어라인**. 관제용 시맨틱 색(ok/warn/crit)은 Linear 절제된 채도로 추가한다.

**색상**
```
--canvas:#010102  --surface-1:#0f1011  --surface-2:#141516  --surface-3:#18191a  --surface-4:#191a1b
--hairline:#23252a  --hairline-strong:#34343a  --hairline-tertiary:#3e3e44
--primary:#5e6ad2  --primary-hover:#828fff  --primary-focus:#5e69d1  --on-primary:#ffffff
--ink:#f7f8f8  --ink-muted:#d0d6e0  --ink-subtle:#8a8f98  --ink-tertiary:#62666d
/* 관제 시맨틱(제품 표면 확장) */
--ok:#27a644  --warn:#d9a531  --crit:#e5484d  --info:#5e6ad2
```
**타이포** (폰트: **Inter** via `next/font/google` — Linear 최근접 무료 대체, 신규 의존성 0. 모노는 이미 설치된 **Geist Mono** 또는 JetBrains Mono)
- Display: Inter 600, 음수 트래킹 (headline 28/‑0.6, card-title 22/‑0.4). Body: Inter 400 (16/‑0.05, 14/0). Button 14/500. Eyebrow 13/500/+0.4(양수). Mono 13/400.
**라운드**: xs4 · sm6 · **md8(버튼·인풋)** · **lg12(카드)** · xl16 · pill9999.
**스페이싱**(4px 베이스): 4·8·12·16·24·32·48·96. 카드 패딩 24, CTA 48.
**엘리베이션**: 그림자 금지. 레벨은 서피스 사다리(canvas→surface-1→2→3)+헤어라인으로. 포커스 링 = 2px `--primary-focus` @50%.
**컴포넌트 규약**: 카드=surface-1 + 1px hairline + radius lg. 버튼=radius md, 패딩 8×14, primary=`--primary`. 상태 배지=pill, surface-2 bg, caption. 탑네비 height 56.
**금지(Linear 준용)**: 두 번째 채도 액센트 남발 금지, 대기광 그라디언트·스포트라이트 카드 금지, CTA pill 라운드 금지, 순수 `#000` 캔버스 금지, 라벤더를 카드 배경으로 쓰지 말 것(브랜드마크·프라이머리 CTA·포커스·링크에만).

### 3.3 참고
목업(`getkkul-admin-mockup.html`)의 IA·정보구조는 유효하되, **비주얼은 위 Linear 토큰으로 대체**한다(목업의 허니 다크 테마 아님). 벌집 시그니처는 Linear 표면에서 과하므로 파이프라인은 절제된 카드/스텝으로 렌더.

---

## 4. IA & 모듈 스펙 (SSR: REQ + AC)

8개 모듈. 좌측 GNB 순서. 각 모듈은 기존 테이블/RPC의 read-layer.

### M-Overview · 관제 홈
- **REQ-OV-1** 서비스 상태 신호등(정상/주의/위험) + 오늘 배치 결과 스트립(감지→수집→요약→발송) + KPI 6종.
  - **AC-OV-1a** 배치 실패율 >5% 또는 요약 백로그 임계 초과 시 상태='주의' 이상으로 표시.
  - **AC-OV-1b** KPI 6종 = 서비스상태·오늘 배치 성공률·활성 구독자(순증)·이메일 오픈율·이번달 LLM비용(예산대비)·열린 인시던트. 6개 초과 금지.
  - **AC-OV-1c** 데이터 소스는 모두 실제 RPC(§5). 하드코딩·목 금지.

### M-Health · 서비스 헬스
- **REQ-HE-1** 업타임/응답시간, 에러 트래킹(신규 에러 타입), 구조화 로그/라이브테일, 최근 배포.
  - **AC-HE-1a** 업타임/에러는 외부 소스(Sentry/업타임 체커) 연동이 없으면 "미연동" 빈 상태를 명시(가짜 수치 금지).
  - **AC-HE-1b** 라이브 로그는 Supabase(파이프라인 로그 테이블/뷰)에서 최신 N건을 폴링.

### M-Pipeline · 다이제스트 파이프라인 (핵심)
- **REQ-PI-1** 배치 타임라인(4단계 상태·소요·건수), 채널별 처리 현황, 재시도 큐, 요약 리드타임.
  - **AC-PI-1a** 4단계 = detect(RSS)/acquire(자막)/summarize(gpt-5-nano 단일 3종)/deliver(4슬롯). content-cutoff·membership-cutoff 반영된 실제 대상 건수.
  - **AC-PI-1b** 채널별 신규/요약/대기 = subscriptions ⋈ videos ⋈ summaries 집계.
  - **AC-PI-1c** 발송 성공률은 `deliveries`(status sent/failed, 멱등 UNIQUE) 기준.

### M-Growth · 그로스
- **REQ-GR-1** 활성 구독자/순증/이탈, 활성화율(첫 다이제스트 오픈), 코호트 리텐션, 획득 퍼널, 레퍼럴 현황.
  - **AC-GR-1a** 레퍼럴 = 기존 `get_referral_progress`/크레딧 원장 재사용. 킬스위치(500만/1인 5만) 소진율 표시.
  - **AC-GR-1b** "가치 통계"는 기존 `get_month_value_stats`/`computeValueSummary` 재사용(중복 로직 금지).

### M-Cost · 비용 · 쿼터
- **REQ-CO-1** LLM 비용(일/모드별·USD), 입력:출력 토큰 비율, YouTube API 쿼터, 이메일 발송량, 예산 대비 소진.
  - **AC-CO-1a** USD = 자체 계측 토큰(summarize stats) × 가격표 파일(§5.4). 모델=gpt-5-nano.
  - **AC-CO-1b** 입력:출력 비율 임계 배지: <10 우수 / 10–25 정상 / 25–50 조사 / >50 심각. getkkul은 전사 지배라 상단 정상 예상.
  - **AC-CO-1c** 이메일 발송/실패는 `deliveries` 기준(Gmail SMTP는 바운스 웹훅 없음 — 발송 결과 테이블로 집계).

### M-Security · 보안
- **REQ-SE-1** 시크릿 스캔·의존성 취약점(SCA)·보안 헤더/SSL·인가(IDOR) 자가점검·이상 탐지 상태 요약.
  - **AC-SE-1a** SCA/시크릿은 CI 산출물(npm audit, gitleaks) 결과를 표시. 없으면 "미구성" 안내.
  - **AC-SE-1b** 인가 자가점검 항목은 "User A 로그인 → ID 치환 → User B 접근 차단" 시나리오의 통과 여부.

### M-Alerts · 알림 · 인시던트
- **REQ-AL-1** 알림 규칙(심각/보통), 인시던트 로그, 포스트모템, 상태페이지 링크.
  - **AC-AL-1a** 기존 운영자 알림(RSS 429/쿠키 만료/발송 실패 등, `OPERATOR_ALERT_EMAIL`)을 인시던트 소스로 수집·표시.
  - **AC-AL-1b** 알림 규칙은 심각(즉시)·보통(다음)으로 분리 저장·표시.

### M-Ops · 운영 데이터
- **REQ-OP-1** 채널/구독자 조회, 다이제스트 이력·재발송, 파이프라인/발송 **수동 실행**.
  - **AC-OP-1a** 구독자 이메일은 마스킹 표시(기존 `lib/referral/mask` 재사용).
  - **AC-OP-1b** 수동 실행·재발송은 **파괴적/부수효과 액션** → 서버사이드 권한 재검증 + 확인 다이얼로그 + 멱등 보장(중복 발송 없음). §9 HOTL.

---

## 5. 데이터 & 신규 객체 (additive only · 전부 에스컬레이션 후)

### 5.1 `admin_users` (신규 테이블 — **에스컬레이션 필수**)
```
admin_users(user_id uuid PK refs auth.users, role text check in ('master','sub_master'),
            invited_by uuid, created_at timestamptz default now())
```
- RLS: 쓰기 service_role 전용. 조회 본인 행. 시드: master 1행(Chess).
- 초대 플로우: master가 초대 레코드 생성 → 초대자가 기존 Supabase Auth 로그인 → 첫 로그인 시 서버 액션이 대기 초대 확인 후 승격. **공개 셀프가입 비활성**.

### 5.2 어드민 인가 미들웨어
- 모든 `/…`(admin) 경로: 세션 존재 **그리고** `admin_users` 소속 **그리고** 역할 충족을 매 요청 서버사이드 검증(IDOR 방지).

### 5.3 관제 read RPC (신규, `SECURITY DEFINER`, service_role) — 전부 additive
- `get_admin_overview()` · `get_pipeline_status(p_date)` · `get_channel_processing()` · `get_cost_breakdown(p_from,p_to)` · `get_growth_metrics()` · `get_incident_log()`.
- 기존 함수 재사용 우선: `get_content_feedback_metrics`, `count_period_digests`, `get_month_value_stats`, `get_referral_progress`. **중복 구현 금지.**

### 5.4 LLM 가격표 파일 (신규, 코드와 분리)
- `packages/domain/src/pricing/llm-prices.ts` (버전 관리). 모델→(input, output) 단가. 가격 변동 시 이 파일만 수정(코드 배포 무관). summarize stats 토큰 × 단가 = USD.

### 5.5 참조하는 기존 스키마(읽기 전용)
`profiles·user_settings·subscriptions·videos·summaries·deliveries(UNIQUE user_id,video_id·status)·membership(pause_reason)·membership_usage·content_feedback(prompt_version)·push_subscriptions·referral/credits·summarize stats`.

---

## 6. 마일스톤 실행 시퀀스 (M0 → M8)

각 마일스톤: 게이트 통과 = 완료. HOTL/에스컬레이션 지점 명시.

### M0 — 모노레포 전환 · 🚩 에스컬레이션(구조 승인)
- **산출물**: npm workspaces. `apps/web`(기존 앱 이관) + `packages/db`(supabase 클라이언트+`database.types`) · `packages/domain`(enum·시간·멤버십·레퍼럴·가격표 순수로직) · `packages/ui`(Linear 토큰+공용 컴포넌트) · `packages/config`(eslint/ts/tailwind 프리셋). `apps/admin` 빈 스캐폴드.
- **불변 조건**: 기존 270+ 테스트·lint·typecheck·build 전부 green(회귀 0). 파이프라인/발송 스크립트(`tsx scripts/*`) 경로 정상.
- **HOTL**: 착수 전 **디렉터리·패키지 경계 계획을 제시하고 승인** 후 실행. (Turborepo 추가는 선택 — devDep 추가라 **에스컬레이션**.)
- **Vercel**: web/admin 두 프로젝트 root directory 분리(문서화만, 배포 설정은 사용자 수행).
- **🔔 M0 완료 직후 예약 조치(Deferred, 사용자 지시)**: Sync hook 파일 2개를 이때 커밋해 자동 드리프트 관리를 켠다 — `.claude/agents/spec-sync.md` + `.claude/settings.json`. (B안으로 M0 동안은 미활성. M0 회귀 리스크가 지나간 뒤 활성화·검증.) **이 단계를 건너뛰지 말 것.**

### M1 — 어드민 셸 + Linear 토큰 시스템 + 인증 게이트 · 🚩 에스컬레이션(`admin_users` 스키마)
- **⏱ 착수 전(DoR)**: 위 M0 예약 조치(`.claude/` hook 2개 커밋 → spec-sync 활성화) 완료 확인. 이후 M1부터는 매 마일스톤 종료 시 spec-sync가 돈다.
- Linear 토큰(§3) `packages/ui`에 구현 + 테마 레지스트리(`linear`만) + `ThemeProvider`.
- Supabase Auth 재사용 로그인 + `admin_users` 미들웨어(§5.1–5.2). **admin_users 마이그레이션은 스키마 변경 → 정지·승인.**
- 사이드바/탑바/네비 셸(8모듈 라우트, 빈 상태).
- **AC**: 비-admin 계정 접근 차단(서버) 테스트, 테마 토큰 스냅샷 테스트.

### M2 — 관제 홈(Overview) · REQ-OV
- `get_admin_overview` RPC(§5.3, 🚩 신규 함수=스키마 계열 정지) + KPI 6종 + 배치 스트립.

### M3 — 파이프라인 · REQ-PI
- `get_pipeline_status`·`get_channel_processing`. 4단계 타임라인·채널 테이블·재시도 큐.

### M4 — 비용 · 쿼터 · REQ-CO · 🚩 (가격표/집계)
- 가격표 파일(§5.4) + `get_cost_breakdown`. USD 환산·모드별·토큰비율·쿼터·이메일.

### M5 — 그로스 · REQ-GR
- `get_growth_metrics` + 기존 레퍼럴/가치 RPC 재사용. 퍼널·코호트·리텐션.

### M6 — 보안 · REQ-SE
- CI 산출물(npm audit·gitleaks) 표시 + 헤더/SSL + IDOR 자가점검 체크리스트.

### M7 — 알림 · 인시던트 · REQ-AL
- 운영자 알림 수집 + `get_incident_log` + 규칙(심각/보통) + 포스트모템.

### M8 — 운영 데이터 · REQ-OP · 🚩 HOTL(파괴적 액션)
- 채널/구독자(마스킹) + 다이제스트 이력·재발송 + 수동 실행. **수동 실행·재발송은 서버 권한 재검증+확인+멱등**.

> **규모가 크면**: M0–M1을 1차 릴리스, M2–M4(관제 코어)를 2차, M5–M8을 3차로 끊어도 된다. 각 릴리스는 SemVer bump + CHANGELOG.

---

## 7. 시크릿 & env 매니페스트 (admin 전용 배포)

| 변수 | 용도 | 유형 | 필수 |
|------|------|------|------|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | 조회 | 일반 | 필수 |
| `SUPABASE_SERVICE_ROLE_KEY` | 관제 전체 read(서버 전용, **admin 배포에만**) | 일반 | 필수 |
| `OPENAI_API_KEY` | (선택) 비용 크로스체크 — 실제 비용은 계측 기반 | 일반 | 선택 |
| `YOUTUBE_API_KEY` | 쿼터 소진 조회 | 일반 | 필수 |
| `RESEND_API_KEY` / `GMAIL_*` | 이메일 발송 결과(주로 deliveries로 집계) | 일반 | 선택 |
| `SENTRY_AUTH_TOKEN`/`SENTRY_DSN` | 에러 트래킹(연동 시) | 일반 | 권장 |
| `ADMIN_SESSION_SECRET` | 어드민 세션 | 정적 시크릿 | 필수 |

- **규율**: `.env.example`(키 이름만) 커밋 / 실제 값은 gitignore된 `.env.local` / service_role은 서버사이드·admin 배포에만 / `NEXT_PUBLIC_`에 service role 절대 금지 / 코드·로그·대화 평문 노출 금지(기존 CLAUDE.md 상속).

---

## 8. 검증 하네스 & CI 게이트
- 게이트: `lint + typecheck + test + build` (workspace 전체). AC→테스트 1:1 매핑. 실패 self-correct.
- CI에 추가 권장(🚩 신규 도구=에스컬레이션): `npm audit`(SCA)·gitleaks(시크릿)·security headers 체크 → M6이 이 산출물을 표시.
- 개별 영상/채널 실패가 전체를 막지 않는다(격리·회복력, 상속).

---

## 9. HOTL / 에스컬레이션 체크포인트 (한눈에 — 진행 전 정지)

| # | 지점 | 마일스톤 | 왜 |
|---|------|----------|----|
| 1 | 모노레포 디렉터리·패키지 경계 | M0 | 아키텍처 경계 변경 |
| 2 | Turborepo 등 devDep 추가 | M0 | 신규 의존성 |
| 3 | `admin_users` 마이그레이션 | M1 | DB 스키마 변경 |
| 4 | 신규 관제 RPC 생성 | M2–M7 | DB 객체 변경 |
| 5 | 차트/테이블 라이브러리 도입 여부(recharts 등) | M2+ | 신규 의존성 — 없으면 SVG 자작 |
| 6 | LLM 가격표·집계 정의 | M4 | 비용 계산 정확성 |
| 7 | 수동 실행·재발송(파괴적) | M8 | 비가역/부수효과 |
| 8 | CI 보안 스캐너 추가 | M6/M8 | 신규 도구 |

---

## 10. Sync 거버넌스 — SOT↔코드 드리프트 동기화 ⭐

**전제**: SOT(PRD/SSR/EXECUTION-PLAN)가 있어도 구현 중 결정이 갈리면 문서와 코드가 어긋난다(silent spec-code drift). 이 드리프트가 "한 큐 0→1" 파이프라인의 최대 리스크다. 원칙: **스펙에도 코드와 동일한 거버넌스(버전관리·리뷰·CI 게이트·기록)를 적용**하고, 드리프트를 **자동 감지 → 분류 → 기록**한다.

### 10.1 트레이서빌리티 (드리프트 감지의 토대)
- 모든 `REQ ↔ AC ↔ 테스트 ↔ 코드/RPC`를 매핑(표는 SSR §트레이서빌리티). 이 매핑이 있어야 "무엇이 어긋났는지"를 기계적으로 감지 가능.
- 규칙: 새 REQ/AC는 반드시 테스트 ID와 구현 지점(파일/RPC)을 함께 등록. **매핑 없는 코드 = 스펙 밖(드리프트 후보)**. 매핑 없이는 병합 불가(CI 게이트).

### 10.2 spec-sync 서브에이전트 (Sync Agent)
- 위치: `.claude/agents/spec-sync.md`. 역할: 마일스톤 종료 시(또는 명시 호출 시) 구현을 SOT와 대조해 **divergence 감지 → 분류 → 기록**.
- 분류 두 갈래:
  - **의도된 결정(intentional)**: 더 나은 설계 판단 → **ADR 생성(ADR-A7+) + PRD/SSR/EXECUTION-PLAN 해당 부분 갱신** + SYNC-LOG 기록.
  - **비의도 드리프트(unintended)**: 근거 없이 스펙과 다름 → **코드 수정 또는 스펙 정정** 중 택1 + SYNC-LOG 기록.
- 모델: 코드·스펙을 읽고 판단하므로 Opus(높음). 자체 컨텍스트에서 돌아 메인 세션 오염 없음.

### 10.3 Hook로 결정론적 강제 (Claude Code)
CLAUDE.md 규칙은 hook 없이는 "권고"에 그친다 — hook를 걸어 **항상 실행**되게 강제한다. (`.claude/settings.json`)
- **Stop hook (agent 타입)**: 턴/마일스톤 종료 시 spec-sync를 돌려, **미기록 드리프트가 있으면 정지 차단(block)** 하고 "무엇이 어긋났고 무엇을 갱신해야 하는지"를 사유로 반환 → Claude가 SOT를 맞출 때까지 못 멈춘다. `stop_hook_active` 가드로 무한 루프 방지.
- **PostToolUse hook (Edit|Write, 경량·비차단)**: 스펙이 참조하는 파일/RPC가 바뀌면 SYNC-LOG에 "미검토 변경" 플래그를 남긴다(관찰용).
- 산출물: `.claude/settings.json`.

### 10.4 SYNC-LOG 문서 (동기화 내역 별도 관리)
- 위치: `docs/admin/SYNC-LOG.md`. **append-only**. 엔트리 = 일시 · 마일스톤 · 영향 REQ/AC · 어긋난 내용 · 분류(결정/드리프트) · 조치(ADR 링크/스펙 갱신/코드 수정) · 커밋.
- 이 로그가 **"0→1 한 큐 개발에서 SOT와 실제 구현이 어떻게·왜 달라졌는가"의 완전한 감사 추적** — Chess님 실험의 핵심 산출물이다.
- 마일스톤 릴리스 시 SYNC-LOG 요약을 CHANGELOG/PR 본문에 링크.

### 10.5 요구 (REQ)
- **REQ-SY-1** spec-sync 서브에이전트 + Stop hook가 각 마일스톤 종료 시 자동 실행되어 드리프트를 감지·분류·기록한다.
  - **AC-SY-1a** 스펙과 다른 구현이 존재하면 Stop이 차단되고 SYNC-LOG에 엔트리가 생성된다(테스트: 의도적 divergence 주입 → 로그 생성 확인).
  - **AC-SY-1b** 의도된 결정은 ADR로 남고 해당 SOT 문서가 갱신된다.
- **REQ-SY-2** 트레이서빌리티 매핑(REQ↔AC↔테스트↔코드) 없이는 병합 불가(CI 게이트).

---

## 11. 비기능 요구 (NFR)
- **데이터 신선도**: 갱신 주기 명시 — 관제 홈 60초 폴링, 비용/그로스 5분, 헬스 로그 실시간 폴링. 화면에 마지막 갱신 시각 표시.
- **성능/스케일**: videos/summaries 등 대량 테이블은 **서버측 페이지네이션 + 집계 RPC**로. 목록 기본 25행·커서 기반. 무거운 집계는 RPC에서 사전 집계(클라이언트 대량 fetch 금지).
- **어드민 자체 관측성**: 관제탑 스스로의 에러/성능을 로깅(관제탑이 안 보이면 안 된다). Sentry 스코프를 web/admin 분리.
- **가용성/격리**: 어드민 다운이 사용자 서비스에 영향 0(완전 분리 배포, ADR-A2).
- **응답성**: 관제 홈 초기 TTI 목표 < 2.5s(집계 RPC·캐시 활용).

## 12. 상태 스펙 (Empty / Loading / Error)
모든 데이터 위젯은 3상태를 명시한다(프론트 품질 핵심 · 지금까지 빠져 있던 부분):
- **Empty**: 데이터 없음/미연동 시 "왜 비었는지 + 다음 행동"을 안내(가짜 0 금지). 예: Sentry 미연동 → "에러 트래킹 미연동 · 연결 방법".
- **Loading**: 스켈레톤(레이아웃 시프트 방지). 부분 로드 우선 표시(전체 블로킹 금지).
- **Error**: 실패 사유 + 재시도. 위젯 하나의 실패가 화면 전체를 깨지 않는다(격리, 상속).
- **REQ-ST-1** 각 데이터 위젯은 empty/loading/error 상태를 가진다. AC: 세 상태 각각 렌더 테스트.

## 13. 마일스톤 DoR/DoD · 접근성 · 배포 체크리스트
- **DoR(착수 전)**: 선행 마일스톤 완료 · 관련 REQ/AC 확정 · 필요한 RPC/스키마 에스컬레이션 승인 · 트레이서빌리티 항목 사전 등록.
- **DoD(완료)**: `lint+typecheck+test+build` green · AC↔테스트 매핑 완료 · **SYNC-LOG 갱신** · 상태 스펙 구현 · (사용자 대면 변경 시) SemVer+CHANGELOG.
- **접근성 플로어(WCAG AA 지향)**: 키보드 포커스 가시(포커스 링 토큰) · 대비 4.5:1 · **의미색에 텍스트/아이콘 병기**(색만으로 상태 전달 금지) · `prefers-reduced-motion` 존중.
- **배포 체크리스트**: web/admin 두 Vercel 프로젝트 env 분리 검증 · `service_role`가 **admin 배포에만** 존재하는지 확인 · admin 도메인 접근 통제 · `.env.example`만 커밋.

## 14. 방법론 근거 (2025–2026 SDD 실무)
이 파이프라인은 최근 spec-driven development 합의를 따른다:
- **Spec-anchored**(spec-first를 넘어): 스펙을 코드 수명 내내 함께 유지·버전관리. 행동 변경 시 스펙을 먼저/동시에 갱신.
- **"드리프트는 새로운 기술부채"**: AI 에이전트의 병목은 생성 속도가 아니라 의도와 어긋난 코드. 방지책 = continuous validation loop(계약 테스트·드리프트 감지·의도된 변경의 스펙 자동 반영).
- **스펙에도 코드와 같은 거버넌스**: 버전관리·리뷰·CI 게이트·기록(§10).
- **작은 검증 증분**: 마일스톤마다 사람이 정렬 확인해 드리프트 조기 차단(1000줄 덤프 리뷰 금지).
- **좋은 스펙 6요소**(PRD/SSR 반영): 결과·범위경계·제약·선행결정·작업분해·검증기준.
- **강제 메커니즘**: GitHub Spec Kit(Specify→Plan→Tasks→Implement) 흐름 + Claude Code hooks/subagents로 거버넌스를 코드화.

---

## 15. 최초 킥오프 프롬프트 (Claude Code에 복붙)

```
이 리포(getkkul, 현재 v0.6.0)에 관제 어드민을 0→1로 구축한다.
단일 진실 공급원: docs/admin/EXECUTION-PLAN.md (이 문서). 그리고 기존 CLAUDE.md·docs/PRD.md·docs/SSR.md·docs/adr/*를 먼저 읽어라.

지금은 Plan Mode다(Shift+Tab). 코드 수정 전에. ultrathink.
1) 이 문서와 기존 컨스티튜션을 읽고,
2) M0(모노레포 전환)의 구체 실행 계획 — 디렉터리 구조, 이관 대상, 패키지 경계,
   기존 270+ 테스트를 green으로 유지할 전략 — 을 제시하라.
3) §9의 에스컬레이션 지점(특히 #1 구조, #3 admin_users 스키마)에서는 반드시 정지하고 내 승인을 받아라.

방법론은 SDD→TDD·HOTL(기존 CLAUDE.md 상속). 각 AC는 실패 테스트부터.
Agent Teams는 쓰지 마라 — 단일 세션 순차 진행. 실행은 Opus, 정리·포매팅만 Sonnet 5.
각 마일스톤 종료마다 spec-sync(Stop hook)로 SOT↔코드 드리프트를 점검하고, 어긋남은 docs/admin/SYNC-LOG.md에 기록하라(의도된 결정은 ADR로, 비의도 드리프트는 수정). 트레이서빌리티(REQ↔AC↔테스트↔코드) 없이 병합하지 마라.
완료 기준은 lint+typecheck+test+build green. 승인 없이 스키마/의존성/파괴적 작업을 진행하지 마라.
계획 승인 후 M0부터 순차 진행하되, 각 마일스톤 종료 시 게이트 통과 + 보고 후 다음으로 넘어가라.
```

> **세션 설정**: 착수 전 `/effort max`(엑스트라)로 걸어두고, 위 프롬프트를 Plan Mode에서 실행. `ultrathink`는 프롬프트에 이미 포함(키워드).

---

## 부록 A — 현재 리포 사실 요약 (2026-07-12 / v0.6.0)
- **스택**: Next 16.2.10 · React 19.2.4 · Tailwind v4 · Supabase(@supabase/ssr) · openai(gpt-5-nano) · Geist 폰트 · nodemailer(Gmail)+Resend(fetch) · web-push · fast-xml-parser · Vitest · tsx · TS strict · npm.
- **파이프라인**: detect(RSS)→acquire(자막/STT)→summarize(gpt-5-nano 단일 3종, reasoning minimal)→deliver(이메일+푸시). pg_cron dispatch(UTC 22:30/02:30/08:30/12:30 = KST 07:30/11:30/17:30/21:30) + GitHub Actions 백업. content-cutoff 2026-07-10, membership-cutoff(published_at≥가입).
- **격리 인터페이스**: `fetchContent(source)`, `notify(user,message)`(+`createNotifier()` 팩토리 Gmail/Resend).
- **비용**: WO-COST-001(ADR-0010) — Gemini 전환 반려(전사 지배로 input 2배 불리), gpt-5-nano 유지, 토큰 계측(summarize stats).
- **버전 규약**: SemVer, `package.json.version` 단일 소스, CHANGELOG, `git tag`(ADR-0012).
- **범위 경계(상속)**: "운영자 어드민 대시보드"가 원래 v2/v3 — 이 문서가 그 스펙.

## 부록 B — Linear 토큰 전체 참조
§3.2에 값 수록. 추가 상세(surface 사다리, 타이포 스케일 전체, 컴포넌트별 padding/radius)는 Linear DESIGN.md 규격을 따른다: 카드 lg(12)+hairline, 버튼 md(8)+8×14, 배지 pill+surface-2, 포커스 2px primary-focus@50%, 그림자 대신 서피스 사다리, 라벤더는 브랜드마크·프라이머리 CTA·포커스·링크에만.
