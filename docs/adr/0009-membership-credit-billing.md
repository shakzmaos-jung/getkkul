# ADR-0009 — 멤버십 구독 & 크레딧 결제

- 상태: 채택
- 날짜: 2026-07-10
- 관련: `docs/membership-spec.md`, `docs/referral-spec.md`(credit_ledger), ADR-0008(referral credit)

## 배경
사업자 등록·PG 연동 전이라, 크레딧을 서비스 내 통화로 삼아 월 구독 멤버십(Free/Small/Medium/Large) 결제 시스템을 미리 구축한다. 크레딧 원장은 referral 시스템이 이미 제공한다(`credit_grants` 로트 + `credit_transactions` 원장, `use_credits(user, payment_amount)` RPC = FIFO·만료임박순, 결제액 50% 상한).

## 결정
1. **크레딧 원장 단일화**: 멤버십 결제의 크레딧 차감은 별도 잔액 없이 referral 의 `use_credits` RPC(FIFO·50% 상한)로만 기록한다. 이중장부 금지(spec §I, AC-C1.1/C2.1, S11).
2. **무PG 100% 할인(운영자 결정)**: PG 가 없는 현재 단계에서는 모든 플랜을 100% 할인해 이번 주기 **청구액을 0원**으로 만든다. 크레딧 50% 상한 엔진은 그대로 구현·테스트하되 청구액이 0이라 실제 차감은 0. PG 를 붙이는 v2 에서 `NO_PG_FREE=false`(`lib/membership/charge.ts`)로 전환하면 정가 청구 + 크레딧 50% + PG 나머지로 자연 전환된다.
3. **PoC 무료 Medium(운영자 결정)**: 기존·신규 전원에게 2026-09-30 23:59:59 KST 까지 Medium 혜택을 기본 제공(status `poc_free`). 종료 시 크레딧 결제 전환 또는 Free 강등, 7일 전 알림.
4. **결제일 anchor day**: 가입일의 '일'을 anchor 로 저장, 매달 유효 최대근접일 clamp(1/31→2/28·29→3/31 복귀). 전 계산 KST. 종료 경계 = 다음 주기 00:00 KST. 순수 함수로 구현·TDD(`lib/membership/billing-cycle.ts`, S1/S2 무결점).
5. **멱등**: 결제는 `billing_history.idempotency_key = (user_id, 주기시작)` UNIQUE 로 주기당 1회(S7).
6. **날짜 계산 위치**: anchor/비례정산 date 계산은 TS(테스트된 순수 함수)에서 수행하고, 크레딧 차감+원장+주기전환의 원자성은 SECURITY DEFINER RPC 에서 보장한다(계산값을 인자로 전달).

## 데이터
`membership`(1인1행 상태), `membership_usage`(주기별 사용량), `billing_history`(멱등 결제내역), `subscriptions.active`(다운그레이드 초과채널 비활성 보관). 한도·요금은 TS 상수(`lib/membership/plans.ts`).

## 검증
membership-spec J절 S1~S11. 특히 날짜(S1·S2)·멱등(S7)·크레딧 정합(S11)은 자동 계약 테스트로 무결점 요구.
