# SSR 부록 — getkkul 파이프라인 신뢰성 개선 (누락·지연 근본 해결)

**버전** v0.1 · **작성자** Chess (스펙 초안: 협업) · **상태** v1 스펙 확정 · **기반** getkkul SSR v0.2, 현재 코드베이스 분석
**용도** 각 AC는 TDD 테스트의 원천이다. 판정 가능하게 기술한다.
**표기** REQ = 요구사항, AC = 수용 기준. ⚠️ = 사전 결정/작업 필요.

---

## 0. 배경 & 목표

현재 유튜브 콘텐츠가 자주 누락되거나 늦게 요약된다. 코드 분석 결과 원인은 다음과 같다.
- 지연: 감지가 30분 폴링 + GitHub Actions 크론(best-effort, 5~60분 지연·무단 드롭) + 단일 잡 30분 타임아웃.
- 누락: 감지 창 15개 제한(초과분 유실) + `failed`가 종점이라 일시 실패가 영구 누락 + yt-dlp 획득 경로의 잦은 실패.

목표: 감지를 폴링에서 푸시로 전환하고, 실패를 회복 가능하게 만들며, 획득을 안정화하고, 처리를 분리·관측 가능하게 하여 **누락 0에 수렴, 지연 최소화**.

## A. WebSub(PubSubHubbub) 푸시 감지

**REQ-A1** 구독 채널의 신규 영상을 YouTube WebSub 푸시로 감지한다.
- AC-A1.1 공개 콜백 라우트(예: `app/api/webhooks/youtube`)가 존재한다. GET 요청 시 `hub.challenge`를 검증(verify_token 확인) 후 그대로 에코한다.
- AC-A1.2 POST 알림 수신 시 `x-hub-signature`(HMAC) 검증에 통과한 요청만 처리한다. 실패 시 거부한다.
- AC-A1.3 유효한 알림의 Atom 페이로드에서 `yt:videoId`·`yt:channelId`를 파싱해 `videos`에 upsert(status=pending)한다. `video_id` UNIQUE로 중복 방지(제목/설명 수정 재발송·중복 핑에도 멱등).
- AC-A1.4 알 수 없는/미구독 채널의 알림은 무시한다.

**REQ-A2** WebSub 구독을 유지한다(리스는 최대 10일).
- AC-A2.1 채널 구독 시(또는 최초 마이그레이션 시) 허브에 subscribe 요청을 보내 등록한다.
- AC-A2.2 리스 만료 전 재구독하는 주기 작업이 있다(예: 매일). 만료 임박 구독을 갱신한다.
- AC-A2.3 구독 해지(사용자가 채널 구독 취소)한 채널은 unsubscribe한다.
- AC-A2.4 WebSub 구독 상태(리스 만료 시각 등)는 `websub_subscriptions`에 저장된다.

**REQ-A3** 폴링을 백업 보정 경로로 유지한다.
- AC-A3.1 기존 폴링 감지(detect)는 제거하지 않고, 낮은 빈도의 "누락 보정"으로 계속 돈다(웹훅이 놓친 영상을 upsert).

## B. 실패 회복 (failed 재시도화)

**REQ-B1** 전사 실패는 영구 종점이 아니라 회복 대상이다.
- AC-B1.1 획득 실패 시 `videos`에 `retry_count` 증가와 `next_retry_at`(감쇠 백오프) 기록. status는 재시도 가능 상태로 둔다.
- AC-B1.2 이후 처리 런은 `next_retry_at`이 도래한 실패 영상을 다시 획득 시도한다.
- AC-B1.3 최대 재시도(예: N회/기간)를 초과하거나, 영구 실패(영상 삭제·비공개 등 판별 가능한 경우)면 종점 `failed`로 확정한다.
- AC-B1.4 일시 실패(봇차단·네트워크·타임아웃)와 영구 실패를 구분해 기록한다(`failure_kind`).

## C. 관리형 트랜스크립트 API 폴백

**REQ-C1** 획득 레이어에 관리형 트랜스크립트 API 티어를 추가한다.
- AC-C1.1 `fetchContent`의 격리 경계 안에, 관리형 API(⚠️ Supadata 또는 TranscriptAPI, 사전 선택) 구현체를 추가한다.
- AC-C1.2 획득 순서는 사전 결정을 따른다(⚠️ 관리형 API 우선 + yt-dlp 백업, 또는 그 반대). 상위 파이프라인 코드는 순서를 몰라야 한다(격리 유지).
- AC-C1.3 관리형 API 실패 시 다음 티어로 폴백하고, 모든 티어 실패 시에만 REQ-B의 재시도 대상이 된다.
- AC-C1.4 API 키는 환경변수로만 참조한다.

## D. 트리거 분리 & 잡 분할

**REQ-D1** 감지와 처리(전사·요약)를 분리한다.
- AC-D1.1 무거운 처리(acquire+summarize)는 감지와 독립된 워커로 돈다. 느린 전사 배치가 감지를 막지 않는다.
- AC-D1.2 처리 워커는 pending 큐를 소비하며, 한 번에 상한(limit) 만큼 처리하고 다음 주기에 이어간다.

**REQ-D2** 트리거 신뢰성을 높인다.
- AC-D2.1 정각(:00) 스케줄을 피한다(공유 러너 경쟁 회피).
- AC-D2.2 처리 워커 트리거는 GitHub Actions 자체 크론 의존을 줄인다(외부 크론 dispatch 또는 Supabase pg_cron/Edge Functions로 이전 — ⚠️ 방식 선택).

## E. 창 확대 & 백필

**REQ-E1** 감지 누락 구간을 백필한다.
- AC-E1.1 채널별 마지막 감지 영상/시각을 추적한다(`subscriptions` 또는 채널 상태에 기록).
- AC-E1.2 보정 경로가 채널의 최신과 알려진 최신 사이 격차를 발견하면, 업로드 재생목록을 pageToken으로 15개 너머까지 페이지네이션해 백필한다.

## F. 관측성 & 하트비트

**REQ-F1** 파이프라인 실행을 관측 가능하게 한다.
- AC-F1.1 각 실행(detect/acquire/summarize/websub/reconcile)을 `pipeline_runs`에 통계와 함께 기록한다(시작·종료·처리량·실패수·ok).
- AC-F1.2 채널이 평소 주기를 크게 초과해 무소식이거나 감지 불능(RSS·API·WebSub 모두 실패)이면 운영자 알림을 보낸다(기존 detectFailures/health 확장).

**REQ-F2** 외부 하트비트(dead-man's switch)를 둔다.
- AC-F2.1 처리·보정 워커가 정상 완료 시 외부 모니터에 핑을 보낸다. 핑의 부재를 외부에서 감지해 조용한 중단을 포착한다(⚠️ 모니터 선택).

## G. (창의적) 엔드투엔드 실시간 처리

**REQ-G1** 웹훅 수신 즉시 처리한다.
- AC-G1.1 WebSub 알림으로 영상이 등록되면, 그 영상 1건을 즉시 전사·요약하는 처리를 트리거한다(Vercel Serverless 또는 Supabase Edge Function). 배치를 기다리지 않는다.
- AC-G1.2 즉시 처리 실패는 REQ-B 재시도 큐로 안전하게 떨어진다(유실 없음).

**REQ-G2** 자가치유 보정.
- AC-G2.1 하루 1회 보정 잡이 채널 격차 백필(REQ-E)과 오래된 실패 재시도(REQ-B)를 수행해, 웹훅·폴링이 놓쳐도 완전성이 수렴한다.

## H. 데이터 모델 변경

- **videos**(추가): `retry_count` int default 0, `next_retry_at` timestamptz null, `last_error` text null, `failure_kind` enum['transient','permanent'] null. status 재시도 흐름 반영.
- **websub_subscriptions**(신설): id PK, channel_id UNIQUE, lease_expires_at, subscribed_at, status enum['active','pending','expired','unsubscribed'], secret 참조는 env.
- **subscriptions 또는 channel 상태**(추가): channel별 `last_detected_video_id` 또는 `last_detected_at`(백필 격차 판정용).
- **pipeline_runs**(신설): id PK, kind enum, started_at, finished_at, stats jsonb, ok bool.

RLS: 위 운영 테이블은 서비스 롤만. 콜백 라우트는 인증 대신 HMAC 서명 검증.

## I. 비기능 요구사항

- I1 멱등성: 웹훅 중복·재발송, 즉시처리와 배치처리 중복에도 video_id 유니크로 1회만 처리.
- I2 회복력: 개별 영상/채널 실패가 전체를 막지 않는다.
- I3 보안: 시크릿(관리형 API 키, WebSub verify_token/HMAC secret)은 env로만. 콜백은 HMAC 검증.
- I4 기존 CLAUDE.md·PRD·SSR의 규칙·스택·격리 경계를 따른다.

## J. 우선순위 & 단계

- **1단계(급한 불)**: B(failed 재시도화) + C(관리형 API 폴백). 작은 변경으로 누락 즉시 감소.
- **2단계(근본)**: A(WebSub 푸시) + E(백필). 지연·창 누락 근본 제거.
- **3단계(운영)**: D(잡 분리·트리거) + F(관측·하트비트) + G(실시간·자가치유).

## L. 수용성 테스트 시나리오 & 정량 통과 기준

검증은 두 층으로 나눈다. **(1) 자동화 계약 테스트**는 CI에서 상시 실행(모의 페이로드·강제 실패 주입·고정 픽스처). **(2) 종단 수용 체크리스트**는 배포 후 사람이 실제 테스트 채널로 1회 실측(외부 게시 이벤트 의존으로 CI 완전 자동화 불가).

### 정량 통과 기준 (목표치)

- **감지 지연(게시→pending)**: WebSub 정상 경로 p95 ≤ 5분. 폴링 백업 포함 시 p95 ≤ 35분.
- **요약 완료 지연(게시→done)**: 자막 있는 영상 p95 ≤ 15분. 오디오/관리형 전사 필요 영상 p95 ≤ 30분. (어느 경우든 다음 발송 슬롯보다 앞서 준비.)
- **감지 누락률 = 0%**: 구독 채널의 공개 영상은 WebSub·폴링·백필 중 하나로 반드시 등록.
- **일시 실패로 인한 영구 누락 = 0건**: 일시 실패는 재시도로 회복. 종점 failed는 영구 사유만. 종점 failed율 ≤ 2%.
- **WebSub 처리 성공률 ≥ 99%**, 중복/재발송 알림 **중복 처리 = 0건**(멱등).
- **처리 워커 실행 성공률 ≥ 99%**, 무단 누락(silent skip) = 0건(하트비트로 검증).

### 시나리오 (Given–When–Then)

- **S1 WebSub 실시간 감지**: 테스트 채널에 영상 게시 → 5분 이내 videos에 pending 등록, 요약 done까지 자막 영상 15분·비자막 30분 이내. 3회 반복 성공률 100%.
- **S2 실패 회복**: 획득을 강제 실패시킴(일시 사유 모의) → next_retry_at 도래 후 자동 재시도 → 최종 done. 영구 누락 0건.
- **S3 영구 실패 종점화**: 비공개/삭제 영상 → 판별 후 종점 failed. 무한 재시도하지 않음.
- **S4 백필**: 폴링을 수 시간 중단시키고 채널에 15개 초과 게시 → 보정 잡 실행 → pageToken 백필로 유실 0건.
- **S5 관리형 API 폴백**: yt-dlp 강제 실패 → 관리형 API로 전사 성공(또는 반대 순서). 격리 경계 상위 코드 불변.
- **S6 멱등성**: 동일 video_id의 WebSub 중복 핑 + 폴링 중복 감지 + 즉시처리/배치처리 경합 → 최종 1회만 처리.
- **S7 관측·하트비트**: 처리 워커를 강제 중단 → 외부 모니터가 핑 부재를 감지해 알림. 감지 불능 채널 → 운영자 알림.
- **S8 집계 검증(1주 관측)**: 실제 운영 1주간 pipeline_runs 지표로 위 정량 기준(누락률 0%, 지연 p95, 성공률) 충족 확인.

## K. 사전 결정/작업 필요 (⚠️)

1. 관리형 트랜스크립트 API 선택: Supadata(자막 없어도 AI 폴백·다플랫폼·한국어) vs TranscriptAPI(유튜브 특화·빠름·저렴). 선택 후 API 키 발급→시크릿 등록.
2. 획득 순서: 관리형 API 주경로 + yt-dlp 백업 vs 그 반대.
3. WebSub 콜백 시크릿: verify_token, HMAC secret 생성→시크릿 등록. 콜백 URL은 https://getkkul.vercel.app/api/webhooks/youtube.
4. 처리 워커 트리거 방식: 외부 크론 dispatch 유지 vs Supabase pg_cron/Edge Functions 이전.
5. 외부 하트비트 모니터 선택(예: cron-job.org 실패감지, dead-man's switch 서비스).
