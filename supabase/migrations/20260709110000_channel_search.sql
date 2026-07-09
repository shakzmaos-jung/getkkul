-- 채널 검색 등록 (channel-search spec §D). 로컬 카탈로그 + 캐시 + 검색 API 사용량(상한).
-- 감지 쿼터 보호가 최우선: 검색 API 는 일일 상한(search_api_usage)으로 논리 격리.

create extension if not exists pg_trgm;

create type channel_catalog_source as enum ('user_selected', 'api', 'detected');

-- 로컬 카탈로그: 검색 확정/감지된 채널을 축적 → 다음부터 API 없이 로컬 적중.
create table channel_catalog (
  id uuid primary key default gen_random_uuid(),
  channel_id text unique not null,
  title text,
  handle text,
  thumbnail_url text,
  subscriber_hint text,
  source channel_catalog_source not null default 'user_selected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 제목 부분일치(ilike '%q%') 가속용 트라이그램 인덱스.
create index idx_channel_catalog_title_trgm on channel_catalog using gin (lower(title) gin_trgm_ops);

-- 검색어(정규화) 기준 API 결과 캐시(TTL 24h).
create table channel_search_cache (
  id uuid primary key default gen_random_uuid(),
  query_norm text unique not null,
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- 검색 API 일일 유닛 집계·상한(감지와 구분).
create table search_api_usage (
  id uuid primary key default gen_random_uuid(),
  day date unique not null,
  units_used int not null default 0,
  cap int not null default 2000
);

-- RLS: 카탈로그·캐시는 인증 사용자 읽기(공용), 쓰기는 service_role. 사용량은 service_role 전용.
alter table channel_catalog enable row level security;
alter table channel_search_cache enable row level security;
alter table search_api_usage enable row level security;

create policy "catalog - authed read" on channel_catalog
  for select to authenticated using (true);
create policy "search cache - authed read" on channel_search_cache
  for select to authenticated using (true);

-- 검색 API 유닛 원자 소비: 상한 초과면 false(증가 안 함), 여유 있으면 증가 후 true.
create or replace function public.consume_search_api_units(p_units int, p_cap int default 2000)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur int;
  cap_val int;
begin
  insert into public.search_api_usage (day, units_used, cap)
    values (current_date, 0, p_cap)
    on conflict (day) do nothing;
  select units_used, cap into cur, cap_val
    from public.search_api_usage where day = current_date for update;
  if cur + p_units > cap_val then
    return false;
  end if;
  update public.search_api_usage set units_used = units_used + p_units where day = current_date;
  return true;
end;
$$;

revoke execute on function public.consume_search_api_units(int, int) from public, anon, authenticated;
grant execute on function public.consume_search_api_units(int, int) to service_role;
