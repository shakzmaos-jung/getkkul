# SSR 부록 — getkkul 친구추천 크레딧 시스템

**버전** v0.1 · **작성자** Chess (스펙 초안: 협업) · **상태** v1 스펙 확정 · **기반** referral-prd.md, getkkul PRD v0.4 / SSR v0.2, 현재 코드베이스
**용도** 각 AC는 TDD 테스트의 원천이다. 판정 가능하게 기술한다.
**표기** REQ = 요구사항, AC = 수용 기준.

---

## 0. 확정 상수

- 보상액: 추천인 2,000원 + 피추천인 2,000원 (활성화 시).
- 활성화 조건: 채널 구독 ≥ 3 AND 요약 항목 수신 ≥ 10.
- 1인 획득 상한: 50,000원. 예산 킬스위치: 5,000,000원(누적 발행).
- 결제 사용 상한: 결제액의 50%. 유효기간: 지급 건별 5년. 소진 순서: 만료 임박 순(FIFO).
- 단일 단계 양방향(상위 전파 없음). 크레딧 현금화·양도 불가.

## A. 추천 코드 & 링크

**REQ-A1** 각 사용자는 고유 추천 코드를 가진다.
- AC-A1.1 사용자당 정확히 1개의 난수 추천 코드가 생성된다(최초 필요 시 생성, 이후 고정).
- AC-A1.2 코드는 전역 고유하며 추측이 어려운 난수다.

**REQ-A2** 사용자는 추천 링크를 공유할 수 있다.
- AC-A2.1 "공유하기"를 누르면 본인 코드가 포함된 링크가 생성된다(예: /r/{code}).
- AC-A2.2 링크는 표준 공유(복사/OS 공유 시트)로 전달 가능하다.

## B. 가입 연결 (추천 관계 생성)

**REQ-B1** 추천 링크로 유입된 신규 가입은 추천 관계로 기록된다.
- AC-B1.1 링크의 코드가 저장되어, 그 방문자가 회원가입(Google/이메일)을 완료하면 referrals에 (추천인, 피추천인, 코드) 관계가 status=pending으로 1건 생성된다.
- AC-B1.2 한 피추천인은 최초 1회만 추천 귀속된다(referee_user_id 유일). 이미 가입/귀속된 사용자에는 새 추천이 붙지 않는다.
- AC-B1.3 자기 자신 코드로의 가입은 추천 관계를 생성하지 않는다(자기추천 차단).

## C. 활성화 판정

**REQ-C1** 피추천인의 활성화를 판정한다.
- AC-C1.1 활성화 = (해당 사용자의 채널 구독 수 ≥ 3) AND (수신한 요약 항목 누적 ≥ 10).
- AC-C1.2 "요약 항목 수신"은 발송 횟수가 아니라 실제 요약 콘텐츠 건수로 집계한다.
- AC-C1.3 조건 충족 시 referral.status가 pending → activated로 1회 전이된다(중복 전이 없음).

## D. 크레딧 지급

**REQ-D1** 활성화 시 양방향 크레딧을 지급한다.
- AC-D1.1 referral이 activated로 전이될 때, 추천인·피추천인 각각에게 2,000원 지급 건(grant)이 생성된다.
- AC-D1.2 각 지급 건은 granted_at, expires_at(=granted_at+5년), remaining_amount, source_type(referrer/referee)를 갖는다.
- AC-D1.3 지급은 아래 가드(REQ-E)를 모두 통과할 때만 실행된다.
- AC-D1.4 이미 activated된 referral은 재지급되지 않는다(멱등).

## E. 예산 · 상한 가드

**REQ-E1** 지급 전 가드를 검사한다.
- AC-E1.1 1인 상한: 해당 수령자의 추천 획득 누적이 50,000원을 초과하게 되면 그 수령자에게는 지급하지 않는다.
- AC-E1.2 예산 킬스위치: 프로그램 누적 발행이 5,000,000원에 도달하면 이후 신규 추천 크레딧 지급을 중단한다.
- AC-E1.3 한쪽이 상한 초과여도 다른 쪽(상한 미초과)은 정상 지급될 수 있다(개별 판정).
- AC-E1.4 모든 지급/차감은 DB 트랜잭션으로 원자적으로 처리한다(경합 시 중복·초과 방지).

## F. 크레딧 원장 & 사용 (FIFO)

**REQ-F1** 크레딧은 지급 건별 로트로 저장된다.
- AC-F1.1 잔액은 단일 숫자가 아니라, 미만료·잔여 있는 지급 건들의 remaining 합으로 산출된다.
- AC-F1.2 만료일이 지난 지급 건은 잔액에서 제외되고 expiry 트랜잭션으로 기록된다.

**REQ-F2** 크레딧 사용은 만료 임박 순으로 차감한다.
- AC-F2.1 사용 시 잔여 지급 건 중 expires_at이 가장 빠른 것부터 차감한다(FIFO).
- AC-F2.2 결제 1건에서 크레딧으로 차감 가능한 최대치는 결제액의 50%다.
- AC-F2.3 (참고) 실제 결제 연동은 유료화(v2)에서 연결한다. v1은 이 사용 로직(FIFO·50% 상한)을 함수로 구현·테스트만 하고, 실제 체크아웃에는 아직 연결하지 않는다.

## G. 화면 (설정 메뉴)

**REQ-G1** 크레딧 내역 화면.
- AC-G1.1 사용 가능 잔액과 "곧 만료 예정" 금액(예: 30일 이내)을 상단에 표시한다.
- AC-G1.2 지급·사용·만료·소멸 트랜잭션을 시간순으로 표시한다(+지급/−사용/−만료).
- AC-G1.3 크레딧이 향후 유료 결제 할인에 사용된다는 안내 문구를 표기한다.

**REQ-G2** 추천 현황 화면.
- AC-G2.1 사용자가 추천한 피추천인 목록을, 각자의 진행률(채널 x/3, 요약 y/10)과 상태(대기/활성화·지급완료)로 표시한다.
- AC-G2.2 피추천인의 상세 활동(구체적 구독 채널 등)은 노출하지 않는다. *(운영자 결정 2026-07-08: 신뢰 그룹 대상이라 초대 목록에 피추천인 **이메일** + 진행률(채널/다이제스트 카운트) + 목표 달성률까지 표시한다. 여전히 "어떤 채널을 구독했는지" 등 구체 활동은 비노출. ADR-0008 후속.)*

## H. 알림

**REQ-H1** 크레딧 지급 시 수령자에게 알림한다.
- AC-H1.1 지급 발생 시 수령자에게 이메일(및 푸시 사용 시 푸시)로 지급 사실을 알린다(기존 notify 레이어 재사용).

## I. 어뷰징 방지

**REQ-I1** 재가입·자기추천 어뷰징을 차단한다.
- AC-I1.1 이메일은 정규화(소문자화, Gmail의 점·plus 태그 제거 등) 후 해시로 저장·비교한다.
- AC-I1.2 과거에 추천 보상이 발생한 적 있는 정규화 이메일 해시로 재가입 시, 추천 보상을 다시 발생시키지 않는다.
- AC-I1.3 동일 기기·결제수단 지문이 기존 보상 대상과 일치하면 보상을 보류/차단한다. *(v1 이연: `abuse_guard`에 지문 컬럼만 두고 실제 수집·매칭은 유료화(v2, PG 연동)로 미룬다 — 결제 지문은 결제가 없어 데이터 부재, 기기 지문 미수집. 사용자 결정, ADR-0008 §5.)*
- AC-I1.4 자기추천(동일 사용자/기기/이메일)은 관계 생성 단계에서 차단한다.

## J. 탈퇴 처리

**REQ-J1** 탈퇴 시 크레딧과 어뷰징 이력을 규정대로 처리한다.
- AC-J1.1 탈퇴 시 본인 보유 크레딧(잔여 지급 건)은 즉시 소멸하고 forfeit 트랜잭션으로 기록된다. 복구 불가.
- AC-J1.2 탈퇴 계정 데이터는 삭제하되, 어뷰징 방지용 최소 식별정보(정규화 이메일 해시, 보상 이력 플래그, 지문)는 보존한다.
- AC-J1.3 탈퇴한 사용자가 앞서 유발한 추천인 측 보상은 소멸하지 않고 유지된다.

## K. 데이터 모델 (Postgres / Supabase, 초안)

- **referral_codes**(id PK, user_id→profiles UNIQUE, code TEXT UNIQUE, created_at)
- **referrals**(id PK, referrer_user_id→profiles, referee_user_id→profiles UNIQUE, code TEXT, referee_email_hash TEXT, status enum['pending','activated','void'], created_at, activated_at) — CHECK(referrer≠referee). *referee_email_hash: 지급 시 재가입 어뷰징 판정용 정규화 이메일 해시(ADR-0008 §2).*
- **credit_grants**(id PK, user_id→profiles, amount INT, remaining_amount INT, source_type enum['referrer','referee'], source_referral_id→referrals ON DELETE SET NULL, granted_at, expires_at, status enum['active','exhausted','expired','forfeited']) — UNIQUE(source_referral_id, source_type)로 referral당 각 측 1건 강제(멱등, L2). *source_referral_id SET NULL로 피추천인 탈퇴 시에도 추천인 크레딧 유지(AC-J1.3).*
- **credit_transactions**(id PK, user_id→profiles, grant_id→credit_grants NULL, delta INT, kind enum['grant','usage','expiry','forfeit'], memo, created_at)
- **abuse_guard**(id PK, email_hash TEXT UNIQUE, rewarded_before BOOL, device_fingerprints TEXT[], payment_fingerprints TEXT[], created_at, updated_at) — 탈퇴 후에도 보존.
- **referral_program**(id PK, total_issued INT default 0, budget_cap INT default 5000000, reward_amount INT default 2000, per_user_cap INT default 50000, payment_usage_ratio NUMERIC default 0.5, validity_years INT default 5, active BOOL default true) — 단일 행 설정/집계.

RLS: referral_codes / credit_grants / credit_transactions는 user_id=auth.uid() 본인 행만. referrals는 추천인 또는 피추천인 본인만 열람(진행률 목적). abuse_guard / referral_program은 서비스 롤만.

## L. 비기능 요구사항

- L1 금액 정합성: 모든 지급·사용·만료·소멸은 트랜잭션으로 원자적. 잔액은 항상 트랜잭션/로트에서 재계산 가능(불변식 유지).
- L2 멱등성: 활성화 지급은 (referral당 1회) DB 제약으로 강제.
- L3 만료 처리: 만료 판정은 스케줄 잡 또는 조회 시점 계산으로 일관 처리.
- L4 보안·프라이버시: 이메일 해시는 복호 불가 방식. 지문은 최소 수집. 크레딧 관련 쓰기는 서비스 롤.
- L5 기존 CLAUDE.md·PRD·SSR의 규칙·스택·격리 경계를 따른다.

## M. 확정값 요약

보상 2,000×2 / 활성화 채널3+요약10(콘텐츠 건수) / 1인 상한 50,000 / 예산 킬스위치 500만 / 결제 사용 50%·FIFO / 유효 5년(건별) / 원장·추천현황(진행률만) / 재가입 해시 보존 / 탈퇴 시 본인 크레딧 소멸·추천인 보상 유지 / 결제 실연동 v2 이연.
