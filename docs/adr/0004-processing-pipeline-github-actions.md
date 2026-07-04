# ADR-0004 — 처리 파이프라인: GitHub Actions 스케줄 잡

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-05
- **결정자**: Chess (운영자)
- **관련 스펙**: SSR REQ-C (C1·C2), REQ-D/E(후속), PRD §9·§12·§13, CLAUDE.md 격리 경계 ①

## 맥락

감지·전사 파이프라인의 오디오 STT 폴백(AC-C2.2)은 `yt-dlp`+`ffmpeg`(리눅스 바이너리)를
요구하는데, Vercel serverless 함수에서는 바이너리·용량·실행시간 제약으로 사실상 불가능하다.
스펙(자막 우선 + 오디오 폴백)을 온전히 충족하려면 리눅스 도구가 도는 실행 환경이 필요하다.

## 결정

**처리 파이프라인(감지 → 전사 → 요약 → [발송준비])을 GitHub Actions 스케줄 워크플로우에서 실행**한다.

- **실행 방식**: `.github/workflows/pipeline.yml`, `schedule: */30 * * * *`(30분, AC-C1.3) +
  `workflow_dispatch`(수동). 러너에 `yt-dlp`·`ffmpeg` 설치. Node 스크립트(`tsx`)로 파이프라인 실행.
- **상태 저장**: Supabase `service_role`(RLS 우회). videos/summaries/deliveries 쓰기.
- **감지(C1)**: 구독된 distinct `channel_id` 의 RSS(`feeds/videos.xml?channel_id=`)를 폴링,
  Atom 파싱 → `videos` upsert (`video_id` UNIQUE, status=pending).
- **전사(C2)**: `fetchContent(video)` 단일 인터페이스 뒤에 격리(격리 경계 ①).
  1. 자막 우선: `yt-dlp` 자막 덤프(ko/en, 자동자막 포함) → 텍스트. `transcript_source=caption`.
  2. 폴백: `yt-dlp` 오디오 추출 → OpenAI Whisper 전사. `transcript_source=audio`.
  3. 둘 다 실패: 최대 3회 지수 백오프 후 `status=failed`, 파이프라인은 계속(AC-C2.3/2.4, H6).
- **비용**: Whisper 는 자막 실패 시에만 호출(H3). 감지는 무료 RSS.

## 실행 환경 분리

- **웹(Vercel)**: 인증·구독 UI·요약 열람. (M0–M2)
- **처리(GitHub Actions)**: 위 파이프라인. 상시 서버 불필요, 무료.
- **발송 크론(M5)**: KST 3회 정시. 타이밍 정밀도 때문에 Vercel Cron 또는 GH Actions 중
  M5 착수 시 확정(미결).

## 트레이드오프

- GH Actions cron 은 best-effort(수 분 지연 가능) — 30분 감지 주기엔 무해(PRD 지연 허용).
- 스펙의 격리 인터페이스 덕에, 추후 상시 워커/컨테이너로 실행 환경 교체 가능(가역적).

## 결과

- devDep `tsx`(TS 스크립트 실행), dep `fast-xml-parser`(Atom 파싱) 추가.
- GH Actions Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
  `ANTHROPIC_API_KEY`(M4). 러너에 `yt-dlp`·`ffmpeg` 설치 스텝.
