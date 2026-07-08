-- 파이프라인 신뢰성 개선 — B(재시도화) + F(관측)
-- (pipeline-reliability spec §H)

-- ── B: videos 재시도 필드 ──────────────────────────────
create type failure_kind as enum ('transient', 'permanent');

alter table videos
  add column if not exists retry_count int not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error text,
  add column if not exists failure_kind failure_kind;

-- 재시도 도래분 조회 가속(pending 중 next_retry_at 도래한 것).
create index if not exists idx_videos_pending_retry
  on videos (next_retry_at)
  where status = 'pending';

-- ── F: pipeline_runs 관측 ──────────────────────────────
create table pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- detect / acquire / summarize / duration / pipeline / reconcile / websub
  started_at timestamptz not null,
  finished_at timestamptz,
  stats jsonb,
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_pipeline_runs_kind_created on pipeline_runs (kind, created_at desc);

-- 운영 테이블: service_role 전용(정책 없음 = authenticated/anon 차단).
alter table pipeline_runs enable row level security;
