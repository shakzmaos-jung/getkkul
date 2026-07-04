-- getkkul v1 초기 스키마 (SSR §G)
-- 규칙: 모든 타임스탬프는 timestamptz (UTC 저장, SSR H1)

-- ── Enums ─────────────────────────────────────────────
-- 요약 길이: user_settings.summary_length 와 summaries.length_mode 공용
-- 값은 영문 키(ADR-0002). 표시 라벨(짧게/보통/길게)은 messages/ko.json.
create type summary_length as enum ('short', 'normal', 'long');
create type transcript_source as enum ('caption', 'audio', 'none');
create type video_status as enum ('pending', 'processing', 'done', 'failed');
create type summary_language as enum ('ko', 'en');
create type delivery_slot as enum ('0730', '1130', '1730');
create type delivery_channel as enum ('email');
create type delivery_status as enum ('pending', 'sent', 'failed');

-- ── profiles (id = auth.uid) ──────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- ── user_settings ─────────────────────────────────────
create table user_settings (
  user_id uuid primary key references profiles (id) on delete cascade,
  summary_length summary_length not null default 'normal'
);

-- ── subscriptions (채널 구독; 동일 채널 중복 방지) ──────
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  channel_id text not null,
  channel_title text,
  channel_url text,
  created_at timestamptz not null default now(),
  unique (user_id, channel_id)
);
create index idx_subscriptions_user_id on subscriptions (user_id);

-- ── videos (공용; 서비스 롤 쓰기, 인증 사용자 읽기) ─────
create table videos (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null,
  video_id text not null unique,
  title text,
  url text,
  published_at timestamptz,
  transcript text,
  transcript_source transcript_source not null default 'none',
  status video_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index idx_videos_channel_id on videos (channel_id);
create index idx_videos_status on videos (status);
create index idx_videos_published_at on videos (published_at);

-- ── summaries (video_id + length_mode + language 캐시) ──
create table summaries (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos (id) on delete cascade,
  length_mode summary_length not null,
  language summary_language not null default 'ko',
  headline text,
  core_text text,
  body jsonb,
  created_at timestamptz not null default now(),
  unique (video_id, length_mode, language)
);
create index idx_summaries_video_id on summaries (video_id);

-- ── deliveries (멱등성: user_id + video_id UNIQUE, SSR H2) ──
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  video_id uuid not null references videos (id) on delete cascade,
  slot delivery_slot not null,
  channel delivery_channel not null default 'email',
  status delivery_status not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);
create index idx_deliveries_user_id on deliveries (user_id);
