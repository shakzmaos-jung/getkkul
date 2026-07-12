# ADR-0016 — 파이프라인 자동 점검·리포트 (gk_pipeline_check)

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-13
- **결정자**: Chess (운영자)
- **관련**: `scripts/pipeline-check.ts`, `lib/pipeline/health-check.ts`, `supabase/migrations/20260713040000_pipeline_health_snapshot.sql`·`20260713050000_pipeline_check_dispatch_pgcron.sql`, `.github/workflows/pipeline-check.yml`, `.claude/skills/gk_pipeline_check/SKILL.md`

## 맥락

운영자가 "오늘 요약이 적다"를 눈치채야만 이상 여부를 알 수 있었다. 실제 점검 결과 파이프라인은 정상이었고, 적어 보인 원인은 (a) 시간대(오전) (b) 그날 새 업로드가 적음 (c) 신규 구독 채널의 **컷오프 이전 과거 영상**(dead data)이 pending 으로 쌓여 착시를 준 것이었다. 사람이 매번 수동 질의·조사하지 않아도 4단계(탐지·전사·요약·발송) 건강 상태를 정기적으로 통보받을 필요가 있다.

## 결정

**결정적(deterministic) 레포 스크립트 + 기존 스케줄 인프라**로 구현한다. (대안인 "Claude 스킬 + Claude 크론 agentic 실행"은 하루 8회 에이전트 세션 비용과 헤드리스에서 claude.ai 인증 MCP 부재 위험 때문에 기각.)

- **데이터 수집**: DB 함수 `pipeline_health_snapshot()`(SECURITY DEFINER, service_role 전용) 이 지표를 jsonb 로 한 번에 반환. anti-join(요약 누락) 등을 SQL 에서 정확히 계산.
- **판정·렌더**: `lib/pipeline/health-check.ts` 순수 함수(`evaluateIssues`/`buildReport`) — 단위 테스트 대상.
- **실행**: `scripts/pipeline-check.ts`(`createPipelineClient` + `createNotifier`) 가 스냅샷→판정→이메일. `--no-email` 시 stdout 전용(스킬 온디맨드).
- **스케줄**: pg_cron `dispatch_pipeline_check()` 가 KST 08/10/12/14/16/18/20/22(UTC 23,1,3,5,7,9,11,13)에 GitHub `pipeline-check.yml` 을 dispatch. 네이티브 schedule 크론은 백업(pipeline/deliver 와 동일 이중화 패턴).
- **수신처**: `PIPELINE_CHECK_EMAIL ?? OPERATOR_ALERT_EMAIL ?? shakzmaos@gmail.com`. 신규 시크릿·외부 의존성 없음(Gmail 트랜스포트·Vault `github_pat` 재사용).
- **리포트**: 제목에 상태 인코딩(`✅ 정상` / `⚠️ 이상 N건 — …`)해 받은편지함 스캔 가능. 정상일에도 발송(요청 사양). 하루 8통이 과하면 "이상 시에만 발송"으로 1줄 전환 여지.

### 오탐 방지 원칙 (핵심)

모든 backlog 신호는 콘텐츠 컷오프(2026-07-10, `CONTENT_CUTOFF_PUBLISHED_AT`) **이후만** 센다. 신규 구독 채널의 과거 영상(dead data)은 절대 이상으로 잡지 않고 참고치로만 표기한다. 개별 영구실패(삭제·비공개·멤버십 전용·봇차단 라이브)는 정상 범주이며, 급증(≥10건)·성공 0 + 봇차단 다발일 때만 이상으로 승격.

## 검증

- `lib/pipeline/health-check.test.ts`: 정상→✅, dead data·개별 영구실패 비알람, 요약 누락/런 지연/감지·발송 실패/쿠키 만료/실패 급증 각각 이상 판정, HTML 이스케이프.
- 실데이터 스냅샷(2026-07-12): `eligibleUnsummarized 0`, 실패 런 0, 발송 실패 0 → ✅ 정상. dead-data pending 148 은 참고로만.
- 배포 후 `gh workflow run pipeline-check.yml` 1회로 첫 리포트 수신 확인, `cron.job` 등록 확인.

## 영향

- 운영 가시성 확보: 사람이 묻지 않아도 4단계 상태를 하루 8회 통지. 조용한 중단(스케줄러 정지·요약 누락·발송 실패)을 빠르게 포착.
- `pipeline_runs`(REQ-F, ADR 파이프라인 신뢰성)를 소비하는 첫 상시 감시자. 스키마 변경 없음(읽기 전용 함수 + cron 잡 추가).
