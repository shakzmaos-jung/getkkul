# ADR-0005 — 발송 실행 환경(GitHub Actions) & notify 인터페이스(Resend)

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-05
- **결정자**: Chess (운영자)
- **관련**: SSR REQ-E/F, PRD §9, ADR-0004(발송 크론 미결 항목 확정), CLAUDE.md 격리 경계 ②

## 맥락

ADR-0004는 발송 크론 위치(Vercel Cron vs GitHub Actions)를 M5 착수 시 확정하기로 미뤄뒀다.
발송은 DB 조회 + 이메일 발송뿐이라 가볍지만, 하루 3회 정시(KST 07:30/11:30/17:30)가 필요하다.

## 결정

1. **발송 실행 = GitHub Actions 스케줄 워크플로우** (`.github/workflows/deliver.yml`).
   - 3개 cron(UTC 환산: 22:30 / 02:30 / 08:30)으로 KST 3슬롯 트리거. `npm run deliver` 실행.
   - 근거: Vercel Hobby cron 은 2개 제한 + 최대 1시간 지연이라 3슬롯 정시에 부적합.
     GH Actions 는 처리 파이프라인과 동일 환경·무료. 수 분 지연은 스펙 허용(PRD §9 지연 규칙).
   - 향후 Vercel Pro 로 가면 정밀 크론으로 교체 가능(가역적).
2. **발송 격리 인터페이스 = `notify(target, message)`** (CLAUDE.md 격리 경계 ②).
   - v1 구현: **Resend** 이메일(HTTP). 텔레그램/카카오 구현체로 교체 시 상위 코드 불변(F1.1).
3. **다이제스트 구성**(REQ-E):
   - "직전 발송 이후 준비된 영상" = done + 요약 캐시 완료 + `deliveries` 에 sent 없음(멱등성으로 자연 도출).
   - 빈 슬롯 → "새 소식 없음" 발송(E2.3). 다이제스트당 최대 30개, 초과 이월(E2.4).
   - 멱등성: `deliveries UNIQUE(user_id, video_id)` upsert. 발송 실패 시 status=failed → 다음 슬롯 재시도(E3.3).

## 결과

- 환경변수: `RESEND_API_KEY`(개인 계정), `DELIVERY_FROM_EMAIL`(검증 도메인 또는 테스트 발신).
- GH Actions Secrets 에 `RESEND_API_KEY` 추가. 발송 스크립트는 `createPipelineClient` + `notify` 사용.
- 웹 링크는 배포된 앱(getkkul.vercel.app)을 가리킨다(`APP_BASE_URL`).
