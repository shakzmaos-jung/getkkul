# ADR-0015 — 멤버십 다운그레이드 채널: 사유 있는 일시정지로 일원화

- **상태**: 승인됨 (Accepted)
- **날짜**: 2026-07-13
- **결정자**: Chess (운영자)
- **관련**: `supabase/migrations/20260713020000_channel_pause_reason.sql`, `lib/membership/enforce.ts`·`view.ts`, `app/subscriptions/actions.ts`, `components/subscriptions/*`

## 맥락

멤버십 다운그레이드로 채널 한도가 줄면 초과 채널을 삭제하지 않고 보존해야 하고, 사용자에게 "왜 정지됐는지"를 알려야 하며, 재업그레이드 시 자동 복원돼야 한다. 그런데 기존 구현은:
- **이원화**: `subscriptions.active`(멤버십 자동)와 `paused`(사용자 수동)가 별개 컬럼.
- **gap**: 피드·발송·집계 함수가 `paused=false` 만 필터하고 `active` 는 무시 → `active=false`(자동 초과분) 채널의 다이제스트가 계속 노출·발송됨(주석과 불일치).
- 사유·전용 UI 없음.

## 결정

**`paused` 로 일원화 + `pause_reason` 사유 컬럼.**

- enum `pause_reason ('manual','downgrade')`, `subscriptions.pause_reason`(nullable). 정지 아님이면 null.
- `membership_reconcile_channels(p_user, p_limit)`: 다운=수신중(`paused=false`) 중 오래된 것부터 `paused=true, pause_reason='downgrade'`; 업=`pause_reason='downgrade'` 인 것만 최근순 복원(`paused=false, pause_reason=null, active_since=now()`). 수동 정지는 자동 복원 대상 아님. `active` 는 paused 와 동기화(레거시 호환).
- 채널 한도 카운트(`enforce.checkChannelLimit`·`view`): `active=true` → **`paused=false`**(수신중) 기준. 수동 정지 채널은 슬롯을 점유하지 않음.
- `setSubscriptionPause`: 수동 정지 `pause_reason='manual'`; 정지해제 시 한도 초과면 차단(토스트).
- 피드·발송이 이미 `paused=false` 만 노출 → 다운그레이드 정지 채널이 실제로 제외됨(**gap 해소**).
- UI: 일시정지 탭 각 행에 사유 문구(`lib/subscriptions/pause.ts`). downgrade 는 수동 해제 버튼 숨김("업그레이드 시 자동 복원").

## 검증

롤백 트랜잭션 시뮬(실데이터 21채널): 한도 5로 다운 → 수신 5·downgrade 정지 16; 한도 20으로 업 → 수신 20·downgrade 1(한도 초과분만 잔류). 정상.

## 영향

- 백필: 기존 수동 정지 → `manual`, 예전 `active=false`(미정지) → `paused=true, downgrade`(gap 정합화).
- `active` 컬럼은 사실상 `paused` 미러(후속 정리 대상). PoC라 실제 다운그레이드는 아직 없음(정식 과금 후 유효).
