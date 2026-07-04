# ADR-0001 — v1 스택 및 격리 경계 확정

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-05
- **결정자**: Chess (운영자)
- **기반**: PRD v0.4, SSR v0.2

## 맥락

v1 구현 착수 전, PRD/SSR에서 "계획 단계에서 확정"으로 열려 있던 기술 선택과
CLAUDE.md 에스컬레이션 대상(외부 의존성 추가, 아키텍처 방향, 약관 회색지대)을 확정한다.

## 결정

1. **프론트 · 스케줄**: Next.js (App Router) + Vercel Cron.
   - 프론트·API·cron을 Vercel 단일 배포 단위로 일원화. Supabase Auth를 Route Handler와 연동.
   - 발송 스케줄: KST 07:30 / 11:30 / 17:30. RSS 폴링: 30분.
2. **요약 LLM**: Claude (기본 요약 품질 우선, 저비용 경로는 Haiku 4.5 계열).
   - `summarize(transcript, mode, language)` 인터페이스 뒤에 격리.
3. **STT 폴백**: OpenAI Whisper API (자막 우선이므로 호출 빈도 낮음).
   - `fetchContent(source)` 내부의 오디오 폴백 경로에서만 사용.
4. **격리 경계 (핵심)**:
   - ① 콘텐츠 획득: `fetchContent(source)` — RSS 감지 + 자막 우선/오디오 STT 폴백.
   - ② 알림 발송: `notify(user, message)` — v1은 Resend 이메일 구현체.

## 보류 · 재확인 대상

- **콘텐츠 획득 실제 구현 방식(자막/오디오 획득 수단)**: 약관 회색지대.
  지금은 `fetchContent()` 인터페이스만 확정. 구체 수단(예: yt-dlp/자막 획득 경로)의
  장단·법적 리스크는 **M3 착수 시점에 별도 정리해 재승인** 후 진행한다.

## 결과

- 위 스택으로 M0(스캐폴딩)~M7(배포) 진행 가능.
- 스키마 마이그레이션(M1)은 여전히 에스컬레이션 대상 — 적용 전 SQL 승인 필요.
