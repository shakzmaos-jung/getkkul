-- 친구추천 크레딧 시스템 — 스키마 (referral-spec §K)
-- 규칙: 모든 타임스탬프 timestamptz(UTC). 금액 정수(원). RLS 본인 행만(§K RLS).

-- ── Enums ─────────────────────────────────────────────
create type referral_status as enum ('pending', 'activated', 'void');
create type credit_source as enum ('referrer', 'referee');
create type credit_grant_status as enum ('active', 'exhausted', 'expired', 'forfeited');
create type credit_txn_kind as enum ('grant', 'usage', 'expiry', 'forfeit');

-- ── referral_codes (사용자당 1개, 고정) ────────────────
create table referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade unique,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- ── referrals (추천 관계; 피추천인당 최초 1회) ─────────
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references profiles (id) on delete cascade,
  -- 피추천인 탈퇴 시 관계 행은 사라지되(§J), 추천인 측 크레딧은 source_referral_id SET NULL 로 보존.
  referee_user_id uuid not null references profiles (id) on delete cascade unique,
  code text not null,
  -- 재가입 어뷰징 판정용 정규화 이메일 해시(지급 시점 조회, AC-I1.2). 원문 이메일 미저장.
  referee_email_hash text,
  status referral_status not null default 'pending',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  check (referrer_user_id <> referee_user_id) -- 자기추천 차단(AC-B1.3/I1.4)
);
create index idx_referrals_referrer on referrals (referrer_user_id);
create index idx_referrals_status on referrals (status);

-- ── credit_grants (지급 건별 로트) ─────────────────────
create table credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  amount int not null check (amount > 0),
  remaining_amount int not null check (remaining_amount >= 0),
  source_type credit_source not null,
  -- 관계 삭제(피추천인 탈퇴)에도 추천인 크레딧 유지(AC-J1.3): SET NULL.
  source_referral_id uuid references referrals (id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status credit_grant_status not null default 'active',
  -- 멱등성(L2): referral 당 각 측(referrer/referee) 정확히 1건.
  unique (source_referral_id, source_type)
);
create index idx_credit_grants_user on credit_grants (user_id);
create index idx_credit_grants_status on credit_grants (status);
create index idx_credit_grants_expires on credit_grants (expires_at);

-- ── credit_transactions (원장: +지급/−사용/−만료/−소멸) ─
create table credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  grant_id uuid references credit_grants (id) on delete set null,
  delta int not null, -- 지급 +, 사용/만료/소멸 −
  kind credit_txn_kind not null,
  memo text,
  created_at timestamptz not null default now()
);
create index idx_credit_txns_user_created on credit_transactions (user_id, created_at);

-- ── abuse_guard (탈퇴 후에도 보존 — profiles FK 없음, AC-J1.2) ─
create table abuse_guard (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  rewarded_before boolean not null default false,
  device_fingerprints text[] not null default '{}',   -- v1 미수집(스키마만)
  payment_fingerprints text[] not null default '{}',   -- 유료화(v2) 연동 시 사용
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── referral_program (단일 행 설정/집계, id=1 강제) ────
create table referral_program (
  id int primary key default 1 check (id = 1),
  total_issued int not null default 0 check (total_issued >= 0),
  budget_cap int not null default 5000000,
  reward_amount int not null default 2000,
  per_user_cap int not null default 50000,
  payment_usage_ratio numeric not null default 0.5,
  validity_years int not null default 5,
  active boolean not null default true
);
insert into referral_program (id) values (1) on conflict (id) do nothing;

-- ── RLS ───────────────────────────────────────────────
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table credit_grants enable row level security;
alter table credit_transactions enable row level security;
alter table abuse_guard enable row level security;
alter table referral_program enable row level security;

-- referral_codes: 본인 코드 조회 + 최초 생성(get-or-create). 수정/삭제 없음(고정).
create policy "own code - select" on referral_codes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own code - insert" on referral_codes
  for insert to authenticated with check (user_id = (select auth.uid()));

-- referrals: 추천인 또는 피추천인 본인만 조회(진행률 목적). 쓰기는 service_role.
create policy "involved referrals - select" on referrals
  for select to authenticated using (
    referrer_user_id = (select auth.uid()) or referee_user_id = (select auth.uid())
  );

-- credit_grants / credit_transactions: 본인 행 조회만. 쓰기는 service_role.
create policy "own grants - select" on credit_grants
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own txns - select" on credit_transactions
  for select to authenticated using (user_id = (select auth.uid()));

-- abuse_guard / referral_program: 정책 없음 = authenticated 차단, service_role 만 접근(§K RLS, L4).
