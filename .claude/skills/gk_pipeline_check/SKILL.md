---
name: gk_pipeline_check
description: 겟꿀 파이프라인(유튜브 영상 탐지·전사·요약·발송) 건강 상태를 지금 즉시 점검하고 리포트한다. "파이프라인 점검", "오늘 요약 왜 적지", "누락/에러 확인" 같은 요청에 사용.
---

# gk_pipeline_check — 파이프라인 즉시 점검

겟꿀의 콘텐츠 파이프라인 4단계(탐지 → 전사 → 요약 → 발송)가 정상인지 온디맨드로 점검한다.
자동 스케줄(하루 8회 이메일)은 GitHub Actions `pipeline-check.yml` + pg_cron 이 담당하며, 이 스킬은
같은 로직을 채팅에서 즉시 실행해 결과를 보여주는 얇은 래퍼다(ADR-0016).

## 실행 방법

프로젝트 루트에서 이메일 없이(리포트만 stdout) 실행한다:

```bash
npm run pipeline-check -- --no-email
```

- 환경변수 `SUPABASE_URL`(또는 `NEXT_PUBLIC_SUPABASE_URL`)와 `SUPABASE_SERVICE_ROLE_KEY` 가 필요하다.
  로컬 셸에 없으면 `set -a; source .env.local; set +a` 로 로드한 뒤 실행한다.
- `--no-email` 을 빼면 실제로 `PIPELINE_CHECK_EMAIL`(기본 shakzmaos@gmail.com) 로 이메일까지 발송한다.
  채팅 점검에서는 항상 `--no-email` 을 쓴다(불필요한 메일 방지).

## 보고 방법

stdout 으로 나온 리포트(상태 제목 + 4단계 표 + 오늘 처리량 + 이상 목록)를 사용자에게 그대로 전달한다.
- 상태가 `✅ 정상` 이면 4단계 요약과 오늘 수치를 간단히 전한다.
- `⚠️ 이상 N건` 이면 이상 목록을 먼저 강조하고, 각 항목의 원인·다음 조치를 덧붙인다.

## 판정 기준(참고)

판정·렌더는 `lib/pipeline/health-check.ts`(순수 함수), 데이터 수집은 DB 함수
`pipeline_health_snapshot()` 이 담당한다. 오탐 방지 원칙상 **모든 backlog 신호는 콘텐츠
컷오프(2026-07-10) 이후만** 센다 — 신규 구독 채널의 과거 영상(dead data)은 절대 이상이 아니다.
