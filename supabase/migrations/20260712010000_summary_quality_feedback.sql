-- 요약 품질 개선(요약품질 SSR 부록): 프롬프트 버전 컬럼 + 피드백(👍/👎) 데이터 모델 +
-- 피드 RPC 에 구조화 body·본인 피드백 투영 + 운영자 집계 함수.

-- 1) summaries.prompt_version — 생성 시 프롬프트 버전 기록(개선 전후 비교, AC-A2.2/F2.2).
alter table public.summaries
  add column if not exists prompt_version text;

-- 2) content_feedback — 콘텐츠 카드 👍/👎 (REQ-F1, AC-F1.2/F1.3).
do $$ begin
  create type feedback_rating as enum ('up', 'down');
exception when duplicate_object then null; end $$;

create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  length_mode summary_length not null,
  language summary_language not null default 'ko',
  rating feedback_rating not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, video_id, length_mode, language)
);
create index if not exists content_feedback_video_idx on public.content_feedback (video_id);

alter table public.content_feedback enable row level security;
create policy "own feedback - select" on public.content_feedback
  for select using (user_id = (select auth.uid()));
create policy "own feedback - insert" on public.content_feedback
  for insert with check (user_id = (select auth.uid()));
create policy "own feedback - update" on public.content_feedback
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own feedback - delete" on public.content_feedback
  for delete using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.content_feedback to authenticated;
grant all on public.content_feedback to service_role;

-- 3) 피드 RPC 재정의: summaries 에 구조화 body 전체 투영(2단락·하이라이트·제공안함),
--    본인 피드백을 모드별로 함께 반환. 반환 컬럼이 바뀌므로 drop 후 재생성.
drop function if exists public.get_feed_digests(timestamptz, timestamptz, boolean);
create function public.get_feed_digests(
  p_from timestamptz,
  p_to timestamptz default null,
  p_with_bookmarked boolean default false
)
returns table (
  id uuid,
  channel_id text,
  title text,
  url text,
  published_at timestamptz,
  duration_seconds int,
  summaries jsonb,
  pref_mode text,
  bookmarked boolean,
  feedback jsonb
)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select coalesce(
      (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
      true
    ) as ex2h
  )
  select
    v.id,
    v.channel_id,
    v.title,
    v.url,
    v.published_at,
    v.duration_seconds,
    jsonb_object_agg(
      s.length_mode,
      jsonb_build_object('coreText', coalesce(s.core_text, ''), 'body', coalesce(s.body, '{}'::jsonb))
    ) as summaries,
    max(p.length_mode) as pref_mode,
    bool_or(b.video_id is not null) as bookmarked,
    (
      select jsonb_object_agg(cf.length_mode, cf.rating)
      from public.content_feedback cf
      where cf.video_id = v.id and cf.user_id = (select auth.uid()) and cf.language = 'ko'
    ) as feedback
  from public.videos v
  join public.subscriptions sub
    on sub.channel_id = v.channel_id
   and sub.user_id = (select auth.uid())
   and sub.paused = false
  join public.summaries s on s.video_id = v.id and s.language = 'ko'
  left join public.user_video_prefs p on p.video_id = v.id and p.user_id = (select auth.uid())
  left join public.bookmarks b on b.video_id = v.id and b.user_id = (select auth.uid())
  cross join cfg
  where v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (v.duration_seconds >= 60 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and (
      (v.published_at >= p_from and (p_to is null or v.published_at < p_to))
      or (p_with_bookmarked and b.video_id is not null)
    )
  group by v.id, v.channel_id, v.title, v.url, v.published_at, v.duration_seconds
  order by v.published_at desc
  limit 500;
$$;

revoke execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) to authenticated;

drop function if exists public.get_bookmarked_digests();
create function public.get_bookmarked_digests()
returns table (
  id uuid,
  channel_id text,
  title text,
  url text,
  published_at timestamptz,
  duration_seconds int,
  summaries jsonb,
  pref_mode text,
  bookmarked boolean,
  feedback jsonb
)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select coalesce(
      (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
      true
    ) as ex2h
  )
  select
    v.id,
    v.channel_id,
    v.title,
    v.url,
    v.published_at,
    v.duration_seconds,
    jsonb_object_agg(
      s.length_mode,
      jsonb_build_object('coreText', coalesce(s.core_text, ''), 'body', coalesce(s.body, '{}'::jsonb))
    ) as summaries,
    max(p.length_mode) as pref_mode,
    true as bookmarked,
    (
      select jsonb_object_agg(cf.length_mode, cf.rating)
      from public.content_feedback cf
      where cf.video_id = v.id and cf.user_id = (select auth.uid()) and cf.language = 'ko'
    ) as feedback
  from public.bookmarks b
  join public.videos v on v.id = b.video_id
  join public.subscriptions sub
    on sub.channel_id = v.channel_id
   and sub.user_id = (select auth.uid())
   and sub.paused = false
  join public.summaries s on s.video_id = v.id and s.language = 'ko'
  left join public.user_video_prefs p on p.video_id = v.id and p.user_id = (select auth.uid())
  cross join cfg
  where b.user_id = (select auth.uid())
    and v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
  group by v.id, v.channel_id, v.title, v.url, v.published_at, v.duration_seconds
  order by v.published_at desc
  limit 500;
$$;

revoke execute on function public.get_bookmarked_digests() from public, anon;
grant execute on function public.get_bookmarked_digests() to authenticated;

-- 4) 운영자 집계(HOTL 지표, AC-F2.1). 익명 (모드×채널)별 up/down 카운트.
--    전 사용자 집계이므로 SECURITY DEFINER + service_role 전용(개인 피드백 비노출).
create or replace function public.get_content_feedback_metrics()
returns table (length_mode text, channel_id text, up_count int, down_count int)
language sql
security definer
set search_path = ''
as $$
  select
    cf.length_mode::text,
    v.channel_id,
    count(*) filter (where cf.rating = 'up')::int as up_count,
    count(*) filter (where cf.rating = 'down')::int as down_count
  from public.content_feedback cf
  join public.videos v on v.id = cf.video_id
  group by cf.length_mode, v.channel_id
  order by down_count desc;
$$;

revoke execute on function public.get_content_feedback_metrics() from public, anon, authenticated;
grant execute on function public.get_content_feedback_metrics() to service_role;
