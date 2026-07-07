# ADR 0008 — 친구추천 크레딧 시스템 설계 결정

- 상태: 채택 (2026-07-08)
- 맥락: `docs/referral-prd.md` / `docs/referral-spec.md`(v0.1)를 구현하며, 스펙에 판정 기준은 확정돼 있으나
  구현 방식(원자성 위치, 해시 계산 위치, 활성화 트리거, 지문 범위, 가입 귀속 판정)에서 세부 결정이 필요했다.
  사용자 승인: 스키마 변경은 스펙 범위 내 자율, 마이그레이션은 MCP 로 원격 적용, 기기 지문은 v1 미수집(결제는 v2 PG).

## 결정

1. **금액 이동은 DB plpgsql 함수에서 원자 처리(FOR UPDATE).**
   `activate_and_award`/`use_credits`/`expire_credits`/`forfeit_user_credits` 가 단일 트랜잭션 + 행잠금으로
   지급·차감·만료·소멸을 집행한다(L1/L2, AC-E1.4). 순수 TS(`lib/referral/*`)는 같은 규칙의 **테스트 가능한 명세**로
   두고(guard/credit/activation/…), DB 함수가 원자적 집행을 담당한다. 함수는 `SECURITY DEFINER` +
   `search_path=''` 이며 실행 권한을 `service_role` 로만 제한(anon/authenticated/public 에서 revoke — RLS 우회 +
   임의 user_id 인자이므로 필수). 검증: 원격 DB에서 self-rollback 통합 테스트로 happy/idempotency/gate/void/
   per-user cap/budget/FIFO/expire/forfeit/referrer-preserve 전부 통과 확인.

2. **정규화·해시는 TS 한 곳에서.** 이메일 정규화(Gmail 점/plus 제거) + sha256 을 TS(`email-hash.ts`)에서 계산해
   가입 시 `referrals.referee_email_hash` 와 `abuse_guard.email_hash` 에 저장한다. DB 함수는 저장된 해시만 비교해
   SQL/TS 해시 알고리즘 이중화를 피한다. → 스펙 §K `referrals` 에 `referee_email_hash` 컬럼 추가.

3. **활성화는 발송 잡의 스윕으로.** 별도 트리거 대신, 발송(`deliverAll`) 직후 `runReferralActivations` 가 pending
   referral 을 훑어 `activate_and_award` 를 호출한다. 요약 수신 카운트는 발송 시 갱신되므로 자연스러운 시점이고,
   개별 referral 실패가 전체 잡을 막지 않는다(격리·회복력). 지급 발생 시 기존 notify 레이어로 이메일/푸시 알림(AC-H1.1).

4. **지급 멱등성은 DB 제약으로.** `credit_grants UNIQUE(source_referral_id, source_type)` 로 referral당 각 측 1건만
   강제(L2, AC-D1.4). 예산 킬스위치·1인 상한 초과는 cap 을 넘기지 않도록 `+reward > cap` 시 미지급.

5. **기기·결제 지문은 컬럼만, 수집은 이연(사용자 결정).** `abuse_guard.device_fingerprints/payment_fingerprints`
   컬럼은 두되 v1 수집 경로는 만들지 않는다(결제 없음 → 결제 지문 데이터 없음, 유료화 v2에서 PG와 함께). v1 어뷰징
   방지는 정규화 이메일 해시 + 보상 이력 플래그 + 자기추천 차단으로 작동(AC-I1.1/I1.2/I1.4). AC-I1.3 은 v2 로 이연.

6. **가입 귀속은 "방금 만든 계정"에만.** `/r/{code}` 가 코드를 httpOnly 쿠키로 저장하고, OAuth 콜백에서 계정
   생성 시각이 10분 이내인 신규 가입에만 관계를 귀속한다(AC-B1.2 — 기존 회원 로그인에 새 추천이 붙지 않음).
   `referrals.referee_user_id UNIQUE` 가 경합의 최종 방어, `CHECK(referrer<>referee)` 가 자기추천 최종 방어.

7. **추천 현황 진행률은 정의자 함수로.** 추천인은 RLS 상 피추천인의 subscriptions/deliveries 를 못 보므로,
   `get_referral_progress()` 가 집계 수치(채널/요약 카운트)와 상태만 돌려준다 — 구독 채널 등 상세는 비노출(AC-G2.2).

8. **결제 사용(FIFO·50%)은 함수 구현·테스트만, 체크아웃 미연동(AC-F2.3).** `use_credits`(SQL) + `deductFifo`(TS)
   를 두되 실제 결제엔 연결하지 않는다. 유료화 v2에서 연결.

9. **탈퇴 처리.** 삭제 전 `forfeit_user_credits` 로 본인 크레딧 소멸(AC-J1.1). `abuse_guard` 는 profiles FK 가 없어
   보존(AC-J1.2), 추천인 크레딧은 `credit_grants.source_referral_id ON DELETE SET NULL` 로 유지(AC-J1.3).

## 영향

- 마이그레이션 4건(원격 적용 완료): `referral_schema`, `referral_functions`(+out-col fix, exec lockdown),
  `referral_progress_fn`. 새 의존성 없음(node:crypto·기존 supabase/notify 재사용).
- Security Advisor: 함수 실행 권한 lockdown 후 WARN 0. `abuse_guard`/`referral_program` 은 의도적으로 정책 없음
  (service_role 전용, deny-by-default) → INFO 잔존은 설계대로.
- 개인정보처리방침에 "부정 이용 방지 목적의 최소 식별 해시(정규화 이메일 sha256) 보관, 탈퇴 후에도 보존" 근거 문구 추가 필요.
