# Changelog

이 프로젝트의 주요 변경 사항을 기록한다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/),
버전 규칙은 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따른다. 정책 근거는
`docs/adr/0012-versioning-policy.md` 참고.

## [Unreleased]

## [0.10.1] - 2026-07-15

### Fixed
- **구독 채널 검색 결과 UX 개선**: (1) 채널 등록 성공 시 **"채널 등록이 완료되었습니다"** 안내와 함께 검색 결과 목록이 **자동으로 닫힘**(기존엔 목록이 그대로 남고 문구도 "추가됨"). (2) 이미 구독 중인 채널을 선택하면 **"이미 등록된 채널입니다"** 안내. (3) 채널을 고르지 않아도 결과 목록을 닫을 수 있는 **[닫기]** 버튼 추가. (`components/subscriptions/ChannelSearch.tsx`, `app/subscriptions/actions.ts`)

## [0.10.0] - 2026-07-15

### Changed
- **멤버십 채널 한도 상시 시행 + 다운그레이드 자동정지 정책 정리**: 구독중(수신) 채널이 플랜 한도를 넘으면 초과분을 자동 일시정지하고 "멤버십 플랜 한도" 사유로 표시한다. 한도를 다운/업그레이드 **이벤트가 아니라 불변식**으로 상시 시행 — 주기 잡이 매 사이클 `membership_enforce_all_limits()` 를 호출해, POC 부여 등으로 생긴 "그냥 초과" 상태(예: medium인데 구독중 21)도 자동 교정한다.
  - **업그레이드 시 자동 복원 → 수동 해제로 변경**: 상위 플랜으로 올려도 자동정지 채널이 저절로 되살아나지 않는다. 사용자가 직접 [정지해제] 한다(한도 내에서만 가능). 자동정지 채널에도 정지해제 버튼을 노출한다.
  - **정지 순서**: 초과 시 최근 추가한 채널부터 정지(오래 구독한 채널 보존).
  - 사유 문구·뱃지 정리("멤버십 자동정지"), `membership_reconcile_channels` 정지 전용 축소, ADR-0015 개정. (`supabase/migrations/20260715000000_membership_enforce_limits.sql`, `lib/membership/run-cycle.ts`, `components/subscriptions/*`, `lib/subscriptions/pause.ts`)

## [0.9.1] - 2026-07-14

### Changed
- **설정 화면의 '테마' 카드 제거**: 테마 선택은 사이드패널 '화면' 아코디언으로 일원화됨(설정으로 들어갈 필요 없음). (`app/settings/page.tsx`)

## [0.9.0] - 2026-07-14

### Changed
- **다이제스트 콘텐츠 3탭을 상세도 스펙트럼으로 재편**: 간단히 < 자세히 < 최대한. 내부 요약 모드(short/normal/long)를 3탭에 1:1 매핑 — 지금껏 카드에 안 쓰이던 `normal` 모드가 **'자세히'로 활용**되고, **'최대한'** 은 long(사실+함의 결합, 수치·사례까지 최대 상세). '인사이트' 별도 탭은 제외(채널이 다양해 매번 고품질 인사이트 보장이 어려움 — 함의는 '최대한'에 흡수).
  - 요약 시스템 프롬프트를 **상세도 3단계**로 재작성(short=주제·결론+핵심사실, normal=영상 내용 고르게 충실, long=수치·사례·인용까지 최대 상세). `PROMPT_VERSION` bump.
  - **스키마·마이그레이션·기존 요약 재생성 없음** — 신규 영상부터 새 프롬프트 반영, 기존 영상은 새 매핑으로 즉시 표시(빈 탭 없음). 부수 개선: 탭별 선호·피드백이 **구분 저장**(기존엔 자세히/인사이트가 같은 `long` 으로 뭉쳐 유실), 설정 '요약 길이'와 카드 라벨 개념 일치. (`lib/summary/summarize.ts`, `lib/feed/card-views.ts`, `lib/summary/format.ts`)

## [0.8.2] - 2026-07-14

### Changed
- **테마 아코디언에 설명 문구 표시**: 사이드패널 테마 아코디언에서도 각 테마 라벨 아래 설명 텍스트를 표시(설정 화면과 동일). compact 모드는 이제 레이아웃(단일열·패딩)만 담당. (`components/theme/ThemeSelect.tsx`)

## [0.8.1] - 2026-07-14

### Changed
- **사이드패널 테마 선택을 인라인 아코디언으로**: 햄버거 '화면 > 테마' 를 설정 화면으로 이동하는 대신 **그 자리에서 아코디언으로 펼쳐 선택**. 화면을 떠나지 않고 고르며(패널·보이는 화면 색이 실시간으로 바뀜) 계속 비교할 수 있다. 설정 화면의 테마 카드는 유지(두 진입점). (`components/layout/SideMenu.tsx` 아코디언 + `ThemeSelect` compact 모드)

## [0.8.0] - 2026-07-14

### Added
- **읽기 테마 5종 + 시스템**: Light · Dark(톤 조정) · 페이퍼(크림+먹색) · 그레이스케일 · 나이트시프트(웜 다크). 설정 화면 '테마' 카드(미리보기 라디오)와 사이드패널 '화면' 진입점에서 선택. 선택은 **즉시 반영(무깜빡임)** 되고 **localStorage + DB(user_settings.theme)** 로 재방문·기기 간 유지. **'시스템'** 은 OS 밝기에 실시간 추종.
  - 전 색을 CSS 변수 토큰으로 중앙화: 각 테마 = `globals.css` `[data-theme]` 값 세트 + `lib/theme/tokens.ts`. 브랜드 앰버·모달 오버레이·on-color·주말색을 토큰화(하드코딩 제거). **5종 전부 본문·링크·오류 대비 WCAG AA** — `theme-tokens.test` 가 tokens↔globals.css 동기화 + AA 를 강제(회귀 방지).
  - `system` 옵션 추가, 선택 로직/저장/적용 TDD(`resolve.test`·`ThemeSelect.test`). 사이드패널 다크 토글 → 테마 선택 진입으로 교체.

### Changed
- **다크 톤 조정**: 배경을 순검정(명도 3.9%)에서 **~13%(#151517)** 로, 카드는 **16.5%(#1e1e22)** 로 상향 — 눈부심 완화 + 표면 층 구분. 라이트 accent(#0070f3→#0061d5)도 링크 대비 AA 로 보정.

## [0.7.6] - 2026-07-14

### Added
- **개발자 정보 프로필 사진**: `public/profile.png`(512×512) 추가 → 개발자 정보 페이지 아바타가 '정' 이니셜 폴백 대신 실제 사진(원형)으로 표시. (`app/developer/page.tsx`)

## [0.7.5] - 2026-07-14

### Changed
- **홈 히어로 하단 통계 문구·단위·의미 정리**: 보조 수치를 3개 칩으로 명확화 — `그동안 누적 N개`(가입 이후 전체 누적, 값 유지), **`이번달 누적 영상 N개`(신규)**, `구독 중인 채널 N개`(기존 `구독` 재명명). 모든 수치에 `개` 단위 추가.
  - '이번달 누적 영상'은 **현재 이용 중인 월 멤버십 주기(`period_start`) 기준 누적**으로, 다음 월 구독이 시작되면 0부터 다시 카운팅된다. `get_digest_summary()` 에 `period_count` 컬럼 추가(주기 floor=`greatest(가입시각, period_start@KST)`, 같은 RPC 내 계산이라 홈 로딩 왕복 증가 없음). `today_count`/`total_count` 는 불변(회귀 없음). (`components/home/ValueHero.tsx`, `app/page.tsx`)

## [0.7.4] - 2026-07-14

### Changed
- **발송 선별 조회 실패 하드닝**(#99 후속): `candidateVideos` 의 각 조회(user_settings·subscriptions·videos·summaries·deliveries)가 `error` 를 무시하고 빈 배열로 처리하던 것을 **`if (error) throw`** 로 변경. 일시적 조회 실패(연결 포화·타임아웃·`.in()` URL 초과 등)가 조용한 "새 소식 없음"(오탐)으로 둔갑하지 않고, `deliverAll` 의 per-user try/catch 가 `failed` 로 잡아 다음 슬롯 재시도한다(H6 격리 유지, 전체 잡은 계속). #100 의 정체 신호 모니터링과 함께 무음 미발송을 **예방+탐지**로 이중 방어. (`lib/delivery/deliver.ts`)
  - 회귀 테스트: videos·summaries 조회 error 시 `candidateVideos` 가 throw 하는지 검증(`deliver.test.ts`).

## [0.7.3] - 2026-07-13

### Changed
- **모니터링 발송 정체 신호 추가**(인시던트 2026-07-13 재발 방지): 헬스체크가 '실패 행(status≠sent)' 수만 봐서 "후보는 있는데 0 배송"(무음 미발송)을 구조적으로 못 잡던 사각을 닫음. `pipeline_health_snapshot()` 에 **발송 정체 사용자 수**(`stuckDeliveryUsers`) 신호 추가 — 요약 준비된 적격 영상이 있는데 26h 내 정상 발송 0인 사용자를 집계, `health-check.ts` 가 ⚠️ 경보. 고볼륨 백로그 정상 드레인(30/슬롯)은 오탐하지 않도록 26h 무발송 게이트로 방어.
  - 회귀 테스트: 발송 실패 0이어도 정체 사용자가 있으면 이상으로 잡는지 검증(`health-check.test.ts`).

## [0.7.2] - 2026-07-13

### Fixed
- **다이제스트 미발송 인시던트 복구**: `candidateVideos` 의 done 영상 조회가 서버 max-rows(1000) 상한에 걸려, 구독 채널의 done 영상이 1000개를 넘는 사용자는 **가장 오래된 1000개**(전부 멤버십 publish-floor 이전)만 받아 후보가 0이 되어 조용히 미발송되던 버그. 멤버십 floor(`published_at >= 가입시각`)를 SQL(`.gte`)로 내려 상한이 '적격(가입 이후) 구간'에 적용되게 하고 안전 `.limit()` 명시. 멤버십 도입(2026-07-10) 이후 고볼륨 구독자 전원이 미수신하던 문제 해소. (`lib/delivery/deliver.ts`)
  - 회귀 테스트: 서버 상한 초과 상황에서 floor 이후 영상이 후보로 남는지 검증(`candidate-videos.test.ts`).

## [0.7.1] - 2026-07-12

### Security
- **OTP 남용 방지**(8a/8b): 수신 이메일 인증에 요청 쿨다운(60초)과 검증 시도 상한(5회)을 추가. 임의 주소로의 인증메일 폭탄과 6자리 코드 브루트포스를 차단. `user_settings.otp_attempts`/`otp_requested_at` 컬럼 추가(service_role write 전용, 비파괴).
- **오픈리다이렉트 방어**: OAuth 콜백/claim 의 `next` 파라미터를 앱 내부 경로로만 강제(`safeNextPath`). 프로토콜상대(`//host`)·백슬래시·제어문자 차단.
- **IDOR 심층 방어**: 구독 일시정지/삭제 쿼리에 명시적 `user_id` 필터 추가 — RLS 회귀 시에도 타 사용자 행 변경 불가.
- **어드민 인가 심층 방어**: 관제(admin) service_role 데이터 조회 계층에 `requireAdmin` 게이트 삽입 — 미들웨어 우회(예: Next 미들웨어 우회 CVE) 시에도 구독자 PII 미노출.
- **로그 위생**: Whisper 오류 로그의 업스트림 응답 본문 echo 를 200자로 상한.

### Changed
- **파이프라인 단계 격리 강화**(H6): 처리 파이프라인 각 단계를 `runStage` 로 격리 — 한 단계 실패가 후속 단계를 막지 않고, 실패 단계는 기록·요약. 실패 시 잡을 비정상 종료해 모니터링이 인지.
- **격리 경계 정리**: 유튜브 봇차단 카운트를 모듈 전역 대신 `acquire` 결과로 전달(오케스트레이터가 유튜브 세부를 모르도록).
- **문서 드리프트 교정**(CLAUDE.md): 발송 4슬롯(+21:30)·이메일 Gmail 기본·GitHub Actions+pg_cron 스케줄·gpt-5-nano 요약으로 실제 구현과 일치.
- **정리**: 미사용 `CRON_SECRET` 환경변수 템플릿 제거. `database.types.ts` 재생성(otp 컬럼 + 드리프트 정리).

### Tests
- 신규: `run-stage`(단계 격리), `deliverAll`(이메일/푸시 독립 격리·멱등·skip-empty), `detect`(RSS→API 폴백·채널 격리), `safeNextPath`, `requireAdmin`, OTP 쿨다운·시도상한(`otp`/`manageDeliveryEmail`).

## [0.7.0] - 2026-07-13

### Added
- **파이프라인 자동 점검·리포트**(gk_pipeline_check, ADR-0016): 탐지·전사·요약·발송 4단계 건강 상태를 하루 8회(KST 08/10/12/14/16/18/20/22) 점검해 운영자 이메일로 리포트. 상태 제목 인코딩(✅ 정상 / ⚠️ 이상 N건).
  - DB 함수 `pipeline_health_snapshot()`(수집) + `lib/pipeline/health-check.ts`(판정·렌더, 단위테스트) + `scripts/pipeline-check.ts`(실행·발송). pg_cron→GitHub Actions 이중화(`pipeline-check.yml`).
  - 채팅 즉시 점검용 `gk_pipeline_check` 스킬(`npm run pipeline-check -- --no-email`).
  - 오탐 방지: 모든 backlog 신호는 콘텐츠 컷오프(2026-07-10) 이후만 집계 — 신규 구독 채널의 과거 영상(dead data)은 알람 대상 아님.

## [0.6.4] - 2026-07-13

### Changed
- 크레딧 현황 지표 워딩 간결화: 누적 획득 크레딧/누적 사용 크레딧/현재 잔여 크레딧 → **누적 획득 / 누적 사용 / 현재 잔여**.

## [0.6.3] - 2026-07-13

### Changed
- 하단 GNB '채널' → **'구독 채널'**(헤더 타이틀 포함).
- 멤버십 얼리버드 배너: 텍스트 크기 축소(다른 배너와 동일) + **블루 하트 배경 + 블루 테두리**(라이트/다크 유사 체감).
- 크레딧 현황 지표 워딩: 총 획득/사용/잔여 → **누적 획득/사용·현재 잔여 크레딧**, 카드 제목 '크레딧 현황' 추가.
- 서비스 소개 태그라인 → **"구독한 유튜브 콘텐츠의 핵심만"**.

## [0.6.2] - 2026-07-13

### Added
- **서비스 소개** 화면 보강: 한 줄 소개 / 왜 만들었나 / 이런 분께 잘 맞아요 / 겟꿀 잘 쓰는 법.
- **개발자 정보** 화면 보강: 프로필 이미지 자리(앰버 원형, '정' 이니셜 폴백) + 소개 본문.
- 두 화면 문구 전부 i18n(`messages/ko.json` `about`·`developer`)로 관리.

## [0.6.1] - 2026-07-13

### Changed
- 알림(이메일·푸시) 시각 선택 카드 1×4 → **2×2**(시각적 여유).
- 설정 '요약 길이' 라벨을 **간단히 / 자세히 / 인사이트**로 통일 + 부제 갱신.

### Fixed
- 영상 길이 필터 툴팁 **투명 배경** 해결(잠금 카드 opacity 상속 → 팝오버를 body 로 포털해 불투명).
- 친구 초대 '초대한 내역'의 친구 이메일 **마스킹**(크레딧 화면과 동일 규칙).
- 멤버십 **얼리버드 무료 배너 안 보임** 수정(Card `bg-card`와 `bg-accent` 충돌로 흰 배경+흰 글씨 → 일반 div 로).

## [0.6.0] - 2026-07-13

### Changed
- **다이제스트 카드 탭 재구성**: 요점/핵심/심층 → **간단히 / 자세히 / 인사이트**(간단히=요점, 자세히=핵심 사실, 인사이트=맥락·인사이트). 콘텐츠 빈약 시 자세히·인사이트 안내.
- 홈 상단 **가치 히어로** 시각 강조(구별)·'오늘의 다이제스트' 위계 정리.
- 친구 초대·크레딧 화면 **타이틀 중복 제거**(상단 헤더 + 가이드 배지로 통합). `/referral`·`/credits` 가이드 배지 신설.
- 크레딧 화면: 총 획득/사용/잔여 ↔ 적립·사용 내역 **영역 분리**.
- 알림(이메일·푸시) 시각 선택 카드 2×2 → **1×4**.

### Added
- 카드 피드백(👍/👎)에 **활용 안내 툴팁**(평가가 요약 품질 개선에 쓰임).
- 초대한 내역에 **지급 크레딧 금액 + 초대일시 + 지급완료일시**.
- 크레딧 적립 내역에 **피추천인(마스킹 이메일)** 표시.

### Fixed
- 영상 길이 필터 툴팁: 불투명 배경 + **뷰포트 밖으로 삐져나오지 않도록** 위치 보정(모바일 포함).

## [0.5.1] - 2026-07-13

### Added
- 설정 영상 길이 필터 카드에 **ⓘ 탭 툴팁**(hover 아님, 모바일 발견성) — '2분 미만 제외', '2시간 이상 제외' 각각 설명. 문구는 i18n(`messages/ko.json`).

### Changed
- 영상 길이 하한을 **2분(120초)으로 통일**하고 문구 갱신(코드 상수·주석·DB 컬럼 코멘트). **소급 미적용** — 정책 시행(2026-07-13 KST) 이전 감지분은 유지(created_at 그랜드파더링).

### Fixed
- `get_feed_digests` 회귀 2건 복구(2026-07-12 요약개편 시 유실): 길이 하한 60→120, **멤버십 게시 하한(mfloor) 재적용**(가입 이전 백카탈로그 노출 차단).

## [0.5.0] - 2026-07-13

### Added
- 홈 **가치 히어로**: 진입 시 인사말·플랜 배지 + 이번달 압축·절약 시간(원본 대비)을 상기.
- 사이드 메뉴 **크레딧** 메뉴 신설(`/credits`) — 총 획득/사용/잔여 + 적립·사용 내역(적립→친구 초대, 사용→결제 내역 이동).

### Changed
- '친구 초대 & 크레딧' 메뉴를 **친구 초대 / 크레딧** 둘로 분리. 친구 초대는 초대하기·초대한 내역 카드 분리.
- 홈 지표(누적·구독)를 가치 히어로로 흡수, '오늘의 다이제스트' 위로 배치. 홈 친구추천 배너 숨김(복원 가능).
- 멤버십 **다운그레이드 시 초과 채널을 삭제 아닌 사유 있는 일시정지**로(업그레이드 시 자동 복원) — `pause_reason`, 피드·발송 실제 제외(gap 해소, ADR-0015).
- 채널 카드 가독성(채널명·핸들 짤림 개선, "구독 시작일시", 정지 사유 표시). 멤버십 얼리버드 배너 시각 강조.

## [0.4.0] - 2026-07-13

### Changed
- **요약 표현 개선**(ADR-0014): 요점/핵심/심층을 **불릿 배열**로 생성·표시(항목마다 줄바꿈).
- 요점↔핵심 차이 명확화(깊이 재정의): 요점=무엇+핵심사실(10~30초) / 핵심=맥락·개념 누락 없이 핵심사실 / 심층=핵심+수치·예시+맥락·인사이트.
- 라벨 의역: 짧게/보통/길게 → **요점 / 핵심 / 심층**(설정·카드 공용).
- 이메일 다이제스트도 불릿 줄바꿈 반영.

### Removed
- 요약 핵심문장 **하이라이트(밑줄)** 제거.

## [0.3.0] - 2026-07-12

### Changed
- **다이제스트 요약 품질 재설계**(ADR-0013): 길이 모드를 문장 수 → **정보 계층**으로 재정의.
  긴 요약은 [핵심 사실] + [맥락·인사이트] 2단락 + 핵심 문장 하이라이트로 표시.
- 길이 역전 제거: 단조성(short ≤ normal ≤ long) 검증·방어. 빈약한 영상은 적응형으로
  상위 모드를 "제공 안 함" 안내.
- 전사 용어 보수적 교정(채널 도메인 힌트), 과교정 방지.

### Added
- 콘텐츠 카드 하단 **👍/👎 피드백**(재탭 취소·변경) + 운영자 집계 지표.
- 프롬프트 버전 관리(`prompt_version`) 및 회귀 테스트, `docs/summary-prompt.md`.

## [0.2.0] - 2026-07-11

### Added
- 발송 슬롯 **21:30 KST** 추가(이메일·푸시). 설정 화면에 21:30 선택 카드.
- 사이드패널 "메뉴"에 **친구 초대 & 크레딧**(`/referral`) 진입점.
- 버전 관리 체계 도입: `CHANGELOG.md`, git 태그(`vX.Y.Z`), 정책 ADR-0012.

### Changed
- 다이제스트 발송 정시성 개선: Supabase **pg_cron 정시 디스패치** + 실행 시각 가드로
  07:30/11:30/17:30/21:30 **±수분** 발송, off-slot(지연 크론·수동 실행) 발송 차단.
- 설정 화면: '영상 길이 필터' 카드를 '요약 길이' 바로 아래로 이동.
- 사이드패널 '화면' 그룹의 테마 토글 라벨 '다크 모드' → **'테마'**(라이트↔다크 전환에 맞춤).

## [0.1.0] - 초기 베이스라인

- 유튜브 채널 구독·영상 감지·전사·요약·하루 정시 발송(이메일/웹푸시).
- 멤버십/크레딧·친구 초대(추천) 시스템, PWA, 설정·다이제스트·홈 화면.

[Unreleased]: https://github.com/shakzmaos-jung/getkkul/compare/v0.7.3...HEAD
[0.7.3]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.7.3
[0.7.2]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.7.2
[0.7.1]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.7.1
[0.7.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.7.0
[0.6.4]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.6.4
[0.6.3]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.6.3
[0.6.2]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.6.2
[0.6.1]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.6.1
[0.6.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.6.0
[0.5.1]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.5.1
[0.5.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.5.0
[0.4.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.4.0
[0.3.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.3.0
[0.2.0]: https://github.com/shakzmaos-jung/getkkul/releases/tag/v0.2.0
