# SSR 부록 — getkkul PWA 설치 + 모바일 푸시알림

**버전** v0.2 · **작성자** Chess (스펙 초안: 협업) · **기반** PRD v0.4, SSR v0.2, 현재 코드베이스
**용도** 각 AC는 TDD 테스트의 원천이다. 판정 가능하게 기술한다.
**표기** REQ = 요구사항, AC = 수용 기준. ⚠️ = 최종 확인 필요.

---

## 0. 확정된 결정

- 앱 아이콘: 기존 getkkul 아이콘을 그대로 사용(192/512/maskable 파생 생성).
- 프로덕션 URL: https://getkkul.vercel.app (HTTPS, PWA·푸시 전제).
- 스키마: `push_subscriptions` 테이블 신설 + `user_settings`에 슬롯별 불리언 3개 추가.
- 의존성: `web-push` 추가.
- notify 구조: 이메일 `Notifier`는 유지, 푸시용 인터페이스를 병렬 추가 + 발송 오케스트레이터가 채널 선택.
- 푸시 vs 이메일: 독립 운영(중복 허용). 슬롯에 새 항목이 있으면 각 채널이 자기 설정에 따라 발송되며, 이메일·푸시를 함께 받을 수 있다.
- 빈 슬롯 처리: 사용자 설정으로 제어. "새 항목 없으면 푸시 생략", "새 항목 없으면 이메일 생략" 두 토글 제공(기본값 모두 생략=on). 이 결정은 SSR v0.2 AC-E2.3(이메일 '새 소식 없음' 항상 발송)을 대체한다.

## A. PWA 설치 기반

**REQ-A1** 앱을 설치 가능한 PWA로 만든다.
- AC-A1.1 유효한 `manifest.json`(name, short_name, start_url, display=standalone, theme/background color, 아이콘 192·512·maskable)이 제공된다.
- AC-A1.2 서비스워커가 등록되며, 오프라인 최소 캐싱과 푸시 이벤트 수신을 담당한다.
- AC-A1.3 서비스워커는 푸시 수신 시 반드시 알림을 표시한다(showNotification). 표시 없이 종료하지 않는다(iOS 구독 취소 방지).
- AC-A1.4 Lighthouse PWA 설치 가능 조건을 통과한다.

## B. 상단 "앱 설치" 버튼 & OS 선택

**REQ-B1** 상단 메뉴(components/layout 헤더)에 앱 설치 진입점을 둔다.
- AC-B1.1 버튼은 다운로드 아이콘 + 작은 "앱 설치" 텍스트로 표시된다.
- AC-B1.2 이미 설치된(standalone) 상태로 접속하면 버튼을 숨기거나 "설치됨"으로 표시한다.

**REQ-B2** 버튼 클릭 시 OS 선택 다이얼로그를 연다.
- AC-B2.1 다이얼로그에 Android / iOS 선택지가 제공된다.
- AC-B2.2 접속 기기의 OS를 감지해 해당 선택지를 기본 강조한다(선택은 사용자가 변경 가능).

**REQ-B3** Android 경로는 실제 설치를 지원한다.
- AC-B3.1 `beforeinstallprompt` 이벤트를 가로채 보관하고, "다운로드하기(설치)" 버튼으로 네이티브 설치 프롬프트를 띄운다.
- AC-B3.2 설치 프롬프트를 지원하지 않는 환경에서는 수동 안내로 폴백한다.

**REQ-B4** iOS 경로는 수동 설치 가이드를 제공한다(프로그램적 설치 불가).
- AC-B4.1 iOS 선택 시 "공유 → 홈 화면에 추가" 단계를 그림/아이콘/화살표로 안내한다.
- AC-B4.2 iOS 경로에는 자동 다운로드 버튼을 노출하지 않는다(불가능하므로). 안내만 제공한다.

## C. 푸시 구독

**REQ-C1** 설치된 PWA에서 사용자가 푸시 알림을 켤 수 있다.
- AC-C1.1 Android: 브라우저/설치 PWA에서 권한 요청 → 승인 시 구독 생성.
- AC-C1.2 iOS: standalone(홈 화면 설치) 상태일 때만 푸시 구독 버튼을 노출한다. 사파리 탭 상태에서는 노출하지 않고 설치를 먼저 안내한다.
- AC-C1.3 구독 생성 시 endpoint·p256dh·auth 키를 현재 사용자에 연결해 `push_subscriptions`에 저장(upsert)한다.
- AC-C1.4 사용자는 푸시를 끌 수 있고, 해제 시 해당 구독이 삭제된다.
- AC-C1.5 만료·무효 구독(발송 시 410/404 응답)은 자동으로 삭제한다.

## D. 발송 시각 설정 (멀티체크)

**REQ-D1** 설정 화면에서 푸시 발송 시각을 슬롯별로 켜고 끈다.
- AC-D1.1 07:30 / 11:30 / 17:30 세 슬롯이 각각 독립 on/off 토글로 표시된다(멀티체크, 복수 선택 가능).
- AC-D1.2 토글 상태는 사용자별로 `user_settings.push_slot_0730/1130/1730`에 저장된다.
- AC-D1.3 푸시 구독이 없는 사용자에게는 토글을 비활성화하고 먼저 설치·구독을 안내한다.

**REQ-D2** 빈 슬롯 알림 생략 여부를 설정할 수 있다.
- AC-D2.1 설정 화면에 "새 항목 없으면 푸시 생략", "새 항목 없으면 이메일 생략" 두 토글을 제공한다.
- AC-D2.2 두 값은 user_settings.skip_empty_push / skip_empty_email에 저장된다(기본 true).

## E. 발송 연동

**REQ-E1** 기존 발송 플로우(scripts/deliver.ts, lib/delivery)에 푸시 채널을 통합한다.
- AC-E1.1 각 슬롯 발송 시, 그 슬롯 푸시가 켜져 있고 유효 구독이 있는 사용자에게 푸시를 보낸다.
- AC-E1.2 기존 KST 07:30/11:30/17:30 스케줄과 슬롯 판정 로직(lib/delivery/digest 등)을 재사용한다.
- AC-E1.3 이메일과 푸시는 독립 채널이다. 슬롯에 새 항목이 있으면 각 채널이 자기 설정(이메일=전 슬롯, 푸시=슬롯별 토글)에 따라 발송되며, 두 채널을 함께 받을 수 있다(중복 허용).
- AC-E1.4 새 항목이 없는 슬롯의 발송은 사용자 설정을 따른다. skip_empty_push=true면 푸시 생략, skip_empty_email=true면 이메일 생략. false면 각각 "새 소식 없음"을 발송한다.
- AC-E1.5 개별 사용자 푸시 실패가 전체 발송 잡을 중단시키지 않는다(격리·회복력).

## F. notify 채널

**REQ-F1** lib/notify에 web-push 구현체를 추가한다.
- AC-F1.1 푸시용 인터페이스는 타깃(사용자의 구독 목록)과 메시지(title, body, url)를 받는다.
- AC-F1.2 기존 이메일 `Notifier` 인터페이스·구현은 변경되지 않는다.
- AC-F1.3 발송 오케스트레이터가 사용자·슬롯 설정에 따라 이메일/푸시 채널을 선택한다.

## G. 데이터 모델 (추가/변경)

- **push_subscriptions**(id PK, user_id→profiles, endpoint text UNIQUE, p256dh text, auth text, user_agent text, created_at) — RLS: user_id = auth.uid().
- **user_settings**(추가): push_slot_0730/1130/1730 bool default false, skip_empty_push bool default true, skip_empty_email bool default true.

## H. 비기능 요구사항

- H1 시크릿: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT(mailto:shakzmaos@gmail.com)는 환경변수로만 참조. 로컬 .env, GitHub Actions secrets, Vercel env에 등록(Chess 수동).
- H2 HTTPS: 프로덕션 https://getkkul.vercel.app. 서비스워커·푸시는 보안 컨텍스트 필수.
- H3 iOS 신뢰성: 앱 오픈 시마다 구독 유효성 재검증. 서비스워커 상태 소실 대비.
- H4 RLS: push_subscriptions는 본인 행만 접근.
- H5 기존 CLAUDE.md·PRD·SSR의 규칙·스택·격리 경계를 따른다.

## I. 사전작업 (Chess 수동)

- VAPID 키 생성(`npx web-push generate-vapid-keys`) 후 위 3개 환경변수를 로컬 .env, GitHub Actions secrets, Vercel env에 등록.
- (완료됨) 아이콘: 기존 getkkul 아이콘 사용. URL: getkkul.vercel.app.

## J. 확정 완료

1. 푸시 vs 이메일: 독립 운영(중복 허용) — 확정.
2. 빈 슬롯 처리: 설정으로 제어(skip_empty_push / skip_empty_email, 기본 생략) — 확정. SSR v0.2 AC-E2.3 대체.
