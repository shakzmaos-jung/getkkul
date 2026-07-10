-- 멤버십 구독 & 크레딧 결제 스키마 (membership-spec §I).
-- 크레딧 잔액은 별도로 두지 않고 referral 의 credit_grants/credit_transactions(원장)에서 차감한다.
-- 플랜 한도/요금은 TS 상수(lib/membership/plans.ts)로 관리(설정 테이블 대체).

create type membership_plan as enum ('free', 'small', 'medium', 'large');
create type membership_status as enum ('active', 'grace', 'canceled', 'ended', 'poc_free');
create type billing_status as enum ('success', 'failed', 'grace', 'skipped_free', 'proration');

-- ── 사용자별 멤버십 상태 (1인 1행) ─────────────────────
create table membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_code membership_plan not null default 'free',
  status membership_status not null default 'active',
  anchor_day int not null check (anchor_day between 1 and 31),
  period_start date not null,          -- 현재 주기 시작(KST 달력일)
  period_end date not null,            -- 현재 주기 종료 경계(=다음 주기 시작, exclusive, KST)
  next_billing_at timestamptz not null,-- 다음 결제 시각(주기 시작 00:00 KST 의 UTC)
  scheduled_change jsonb,              -- 예약 변경 {plan_code} (다음 주기 적용). null=없음
  grace_until timestamptz,             -- 유예 종료 시각(결제 실패 시). null=유예 아님
  poc_free_until timestamptz,          -- PoC 무료 Medium 종료 시각. null=대상 아님
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_membership_next_billing on membership (next_billing_at);
create index idx_membership_status on membership (status);

-- ── 주기별 사용량 (다이제스트·AI 질의) ──────────────────
create table membership_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  digest_used int not null default 0,
  ai_query_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);

-- ── 결제 내역 (멱등: idempotency_key UNIQUE) ────────────
create table billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  billing_period text not null,        -- 주기 시작 'YYYY-MM-DD'
  plan_code membership_plan not null,
  amount int not null default 0,       -- 청구액(정가; 무PG면 실제 0 처리)
  credit_used int not null default 0,  -- 실제 크레딧 차감(원장 usage 합)
  status billing_status not null,
  idempotency_key text not null unique,
  memo text,
  created_at timestamptz not null default now()
);
create index idx_billing_history_user_created on billing_history (user_id, created_at desc);

-- ── 채널 비활성 보관 (다운그레이드 초과분) ──────────────
-- subscriptions.active=false 면 다이제스트 발송/노출 중단하되 데이터 보관.
alter table subscriptions add column if not exists active boolean not null default true;

-- ── RLS ────────────────────────────────────────────────
alter table membership enable row level security;
alter table membership_usage enable row level security;
alter table billing_history enable row level security;

create policy "own membership - select" on membership
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own usage - select" on membership_usage
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own billing - select" on billing_history
  for select to authenticated using (user_id = (select auth.uid()));
-- 쓰기(결제·주기전환·사용량)는 service_role 전용(정책 없음 = 차단).
