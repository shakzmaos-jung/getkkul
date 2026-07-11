# SSR — getkkul (겟꿀) v1 상세 스펙 요구사항

**버전** v0.2 · **작성자** Chess · **상태** v1 스펙 확정 · **기반** PRD v0.4
**용도** 각 요구사항의 수용 기준(acceptance criteria)은 TDD 테스트의 원천이다. 애매한 조건은 테스트로 만들 수 없으므로 판정 가능하게 기술한다.
**표기** REQ = 요구사항, AC = 수용 기준. ⚠️ = Chess님 확인 필요(제안값 포함).

---

## A. 인증 & 계정

**REQ-A1** 사용자는 Google 계정으로 로그인할 수 있다(Supabase Auth).
- AC-A1.1 로그인하지 않은 사용자가 보호된 페이지에 접근하면 로그인 화면으로 이동된다.
- AC-A1.2 Google 로그인 성공 시 세션이 생성되고, 최초 로그인이면 `profiles`에 사용자 레코드가 1건 생성된다.
- AC-A1.3 재로그인 시 중복 `profiles` 레코드가 생성되지 않는다.

**REQ-A2** 모든 사용자 데이터는 본인만 접근 가능하다(RLS).
- AC-A2.1 사용자 A는 사용자 B의 구독·설정·발송이력 레코드를 조회/수정/삭제할 수 없다(DB 레벨에서 차단).
- AC-A2.2 인증되지 않은 요청은 사용자 스코프 테이블에서 0건을 반환한다.

**REQ-A3** 사용자는 자기 계정과 데이터를 삭제할 수 있다.
- AC-A3.1 계정 삭제 시 해당 사용자의 구독·설정·발송이력이 함께 삭제된다(cascade).
- AC-A3.2 삭제 후 동일 사용자 데이터가 조회되지 않는다.

## B. 채널 구독 관리

**REQ-B1** 사용자는 유튜브 채널을 구독으로 추가할 수 있다.
- AC-B1.1 유효한 채널 식별자(채널 URL 또는 핸들)를 입력하면 구독이 1건 생성되고 채널명이 함께 저장된다.
- AC-B1.2 이미 구독 중인 채널을 다시 추가하면 중복 생성되지 않고 안내된다(unique: user_id + channel_id).
- AC-B1.3 유효하지 않은/존재하지 않는 채널 입력 시 생성되지 않고 오류 메시지가 표시된다.
- AC-B1.4 ⚠️ 개별 영상 URL·재생목록 입력은 v1에서 거부한다(채널 단위만 허용).

**REQ-B2** 사용자는 구독 목록을 조회·삭제할 수 있다.
- AC-B2.1 구독 목록은 본인 것만, 최신 추가순으로 표시된다.
- AC-B2.2 구독 삭제 시 해당 채널은 이후 감지 대상에서 제외된다(기존 발송 이력은 유지).

## C. 콘텐츠 감지 & 획득

**REQ-C1** 시스템은 구독 채널의 신규 영상을 RSS로 감지한다.
- AC-C1.1 채널에 새 영상이 게시되면 다음 폴링 주기 내에 `videos`에 1건 등록된다(status=pending).
- AC-C1.2 이미 등록된 영상은 재등록되지 않는다(unique: video_id).
- AC-C1.3 폴링 주기는 30분으로 한다.

**REQ-C2** 시스템은 영상의 전사 텍스트를 확보한다(자막 우선, 오디오 폴백).
- AC-C2.1 자막이 있으면 자막을 사용하고 `transcript_source=caption`으로 기록한다.
- AC-C2.2 자막이 없거나 실패하면 오디오를 받아 STT로 전사하고 `transcript_source=audio`로 기록한다.
- AC-C2.3 두 경로 모두 실패하면 status=failed로 표시하고, 해당 영상은 발송 대상에서 제외된다(전체 파이프라인은 중단되지 않는다).
- AC-C2.4 ⚠️ 획득 실패 시 최대 3회 지수 백오프 재시도 후 failed 처리(제안값).
- AC-C2.5 획득 로직은 단일 인터페이스(예: `fetchContent(source)`) 뒤에 격리되어, 구현 교체 시 상위 파이프라인 코드가 바뀌지 않는다.

## D. 요약

**REQ-D1** 시스템은 전사 텍스트를 핵심 요약으로 변환한다(소스 언어는 한국어·영어 모두 지원).
- AC-D1.1 요약은 기본적으로 한국어로 생성된다(원문이 영어여도 한국어로 요약).
- AC-D1.2 요약은 원문 전사가 확보된 영상에 대해서만 생성된다.

**REQ-D2** 요약은 사용자가 선택한 길이 모드를 **정보 계층(깊이)**으로 따른다(요약품질 부록 REQ-A, ADR-0013/0014 — 문장 수 규격 폐지, 라벨 요점/핵심/심층).
- AC-D2.1 각 모드는 "몇 문장"이 아니라 정보 층위로 생성되며, **불릿 배열**로 저장·표시된다(하이라이트 폐지 — ADR-0014).
  - 요점(short): 무엇을 다뤘나 + 언급된 핵심 사실 몇 개(10~30초). `body.points[]`.
  - 핵심(normal): 맥락·주요 개념 누락 없이 핵심 사실(완결적). `body.points[]`.
  - 심층(long): **2단락** — ① 핵심 사실(부가 사실·수치·예시로 확장한 `facts[]`) ② 맥락·시사점·인사이트(`insights[]`). `core_text`=불릿 `\n` 결합(정본 평문).
- AC-D2.2 검증은 **단조성**(short ≤ normal ≤ long, 정보량 기준)으로 하고, 위반 시 상위 모드를 미제공으로 낮춰 역전을 사용자에게 노출하지 않는다. long 제공 시 2단락·하이라이트 존재를 검증한다.
- AC-D2.4 적응형 깊이: 모델이 콘텐츠 깊이(depthCeiling)를 함께 판정해, 빈약한 콘텐츠는 상위 모드를 "제공 안 함"으로 저장·표시한다(억지 생성 금지).
- AC-D2.5 보수적 용어 교정: 채널 도메인 힌트로 명백한 오인식만 교정하고, 없던 개체를 지어내지 않는다(과교정 금지).
- AC-D2.3 동일 영상·동일 길이 모드·동일 언어의 요약은 1회만 생성·캐시되어 재사용된다(unique: video_id + length_mode + language). 서로 다른 사용자가 같은 채널을 구독해도 중복 연산하지 않는다. **비용 최적화(ADR-0010): 3종 길이는 전사를 1회만 전송하는 단일 LLM 호출로 동시 생성한다 — 영상·언어당 요약 호출 1회, 저장은 모드별 3행 불변.**

**REQ-D3** 사용자는 웹에서 요약을 영어로 전환해 볼 수 있다(이메일 다이제스트는 기본 언어로 발송).
- AC-D3.1 웹 요약 화면에서 영어 전환을 요청하면 해당 요약의 영어 버전이 표시된다.
- AC-D3.2 영어 버전은 요청 시 생성·캐시되며(language='en'), 재요청 시 재생성하지 않는다.
- AC-D3.3 전환은 요약의 의미를 보존하고 해당 길이 모드의 형식 조건을 유지한다.

## E. 스케줄링 & 발송

**REQ-E1** 감지·처리와 발송을 분리한다.
- AC-E1.1 전사·요약은 영상 감지 시점(발송 시각과 무관)에 수행되어 저장된다.
- AC-E1.2 발송 시각에는 이미 준비된(status=done) 요약만 사용하며, 발송 중 신규 전사·요약을 하지 않는다.

**REQ-E2** 시스템은 하루 3회 정시에 사용자별 다이제스트를 발송한다.
- AC-E2.1 발송은 KST 07:30 / 11:30 / 17:30에 트리거된다.
- AC-E2.2 각 발송은 "해당 사용자의 직전 발송 이후 새로 준비된 영상들"을 담는다.
- AC-E2.3 빈 슬롯(담을 새 영상 없음) 처리는 사용자 설정을 따른다. `skip_empty_email`=true(기본)면 이메일 생략, false면 "새 소식 없음"을 발송. 푸시도 `skip_empty_push`로 동일하게 제어(PWA 부록 AC-D2/E1.4가 이 항목을 대체·확장).
- AC-E2.4 한 번의 다이제스트에 담기는 영상은 최대 30개로 제한하고, 초과분은 다음 발송으로 이월한다.

**REQ-E3** 같은 영상은 한 사용자에게 중복 발송되지 않는다(idempotency).
- AC-E3.1 (user_id, video_id) 조합으로 발송 이력이 유일하게 기록된다.
- AC-E3.2 이미 발송된 (user_id, video_id)는 재발송되지 않는다.
- AC-E3.3 발송이 실패하면 status=failed로 남고, 다음 발송 시각에 재시도 대상이 된다.

## F. 알림 채널 (v1: 이메일)

**REQ-F1** 다이제스트는 이메일로 발송된다.
- AC-F1.1 발송은 "이 사용자에게 이 메시지를 보내라"라는 단일 인터페이스(예: `notify(user, message)`) 뒤에 격리되어, 후속 텔레그램/카카오 구현체로 교체 시 상위 코드가 바뀌지 않는다.
- AC-F1.2 이메일에는 각 영상의 헤드라인·요약·원본 링크가 포함된다.
- AC-F1.3 트랜잭션 이메일 발송은 Resend를 사용한다.

## G. 데이터 모델 (Postgres / Supabase, 초안)

- **profiles**(id=auth.uid PK, email, created_at)
- **user_settings**(user_id PK→profiles, summary_length enum['short','normal','long'] default 'normal' — ADR-0002; 표시 라벨 짧게/보통/길게는 i18n)
- **subscriptions**(id PK, user_id→profiles, channel_id, channel_title, channel_url, created_at, UNIQUE(user_id, channel_id))
- **videos**(id PK, channel_id, video_id UNIQUE, title, url, published_at, transcript, transcript_source enum['caption','audio','none'], status enum['pending','processing','done','failed'], created_at)
- **summaries**(id PK, video_id→videos, length_mode enum['short','normal','long'], language enum['ko','en'] default 'ko', headline, core_text, body jsonb{points|facts,insights|notProvided}, prompt_version, created_at, UNIQUE(video_id, length_mode, language))
- **content_feedback**(id PK, user_id→profiles, video_id→videos, length_mode, language, rating enum['up','down'], created_at, updated_at, UNIQUE(user_id, video_id, length_mode, language)) — 요약 품질 👍/👎 (요약품질 부록 REQ-F, RLS 본인 행)
- **deliveries**(id PK, user_id→profiles, video_id→videos, slot enum['0730','1130','1730'], channel enum['email'], status enum['pending','sent','failed'], sent_at, UNIQUE(user_id, video_id))

RLS: profiles/user_settings/subscriptions/deliveries는 `user_id = auth.uid()` 행만 접근. videos/summaries는 인증 사용자 읽기 가능, 쓰기는 서비스 롤만.

## H. 비기능 요구사항

- **H1 타임존**: 모든 타임스탬프는 UTC로 저장, 스케줄·표시는 KST로 변환.
- **H2 멱등성**: 재발송 방지는 DB unique 제약으로 강제(앱 로직에만 의존하지 않음).
- **H3 비용**: 요약은 (영상, 모드)별 1회 캐시. 획득은 저렴한 자막 경로 우선.
- **H4 보안**: 시크릿·키는 환경변수로만 관리, 서비스 롤 키는 서버측에서만 사용. 사용자 스코프 테이블에 RLS 적용.
- **H5 프라이버시**: 최소 수집(이메일·구독 소스). 계정 삭제 시 cascade.
- **H6 회복력**: 개별 영상 획득/요약/발송 실패가 전체 잡을 중단시키지 않는다.

## I. 확정 사항 & 남은 가정

**확정됨**
- 요약 길이 정의(정보 계층, ADR-0013/0014): 요점=무엇+핵심사실(10~30초) / 핵심=맥락·개념 누락 없이 핵심사실 / 심층=핵심+수치·예시+맥락·인사이트. 전부 불릿 배열(줄바꿈), 하이라이트 폐지. 단조성 보장, 빈약 콘텐츠는 적응형으로 상위 모드 미제공. 기본 핵심(normal).
- RSS 폴링 주기: 30분.
- 다이제스트당 최대 영상 수: 30개, 초과분 이월.
- 이메일 제공자: Resend.
- 언어: 한국어·영어 소스 모두 지원. 요약은 한국어 기본 + 영어 전환 제공(REQ-D3).

**확정됨 (추가)**
- 획득 실패 재시도: 최대 3회 지수 백오프 후 failed 처리.
- 발송 지연: 07:25 게시분이 07:30에 처리 미완이면 다음 슬롯에 포함.
