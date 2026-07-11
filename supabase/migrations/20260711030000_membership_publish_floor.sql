-- 멤버십 구독시작 기준 다이제스트 하한(업로드시점).
-- 사용자가 멤버십을 시작한 시점(membership.created_at) 이후 유튜브에 업로드된(published_at)
-- 다이제스트만 조회·집계되게 한다. 구독 이전 백카탈로그(다른 사용자로 인해 이미 수집돼 있던 것) 차단.
-- 읽기 함수에 published_at 하한만 추가(순수 additive, 데이터 변경 없음). active_since(정지/해제)와 독립.
-- 멤버십 행 없으면 '-infinity'(하한 없음, 안전 기본값). 북마크(get_bookmarked_digests)는 면제(미변경).

-- 1) get_digest_summary (오늘/누적 카운트) — cfg 에 mfloor 추가 + published_at >= mfloor
create or replace function public.get_digest_summary()
returns table (today_count int, total_count int)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select
      coalesce(
        (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
        true
      ) as ex2h,
      coalesce(
        (select mem.created_at from public.membership mem where mem.user_id = (select auth.uid())),
        '-infinity'::timestamptz
      ) as mfloor
  ),
  q as (
    select v.id, v.published_at
    from public.videos v
    join public.subscriptions sub
      on sub.channel_id = v.channel_id
     and sub.user_id = (select auth.uid())
     and sub.paused = false
    cross join cfg
    where v.status = 'done'
      and (sub.active_since is null or v.created_at >= sub.active_since)
      and (
        v.duration_seconds is null
        or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
      )
      and v.published_at >= cfg.mfloor
      and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  )
  select
    count(*) filter (
      where (published_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    )::int as today_count,
    count(*)::int as total_count
  from q;
$$;

-- 2) get_feed_digests (피드 카드) — 비북마크 브랜치에만 published_at >= mfloor (북마크분 면제)
create or replace function public.get_feed_digests(
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
  bookmarked boolean
)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select
      coalesce(
        (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
        true
      ) as ex2h,
      coalesce(
        (select mem.created_at from public.membership mem where mem.user_id = (select auth.uid())),
        '-infinity'::timestamptz
      ) as mfloor
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
      jsonb_build_object('coreText', coalesce(s.core_text, ''), 'bullets', coalesce(s.body->'bullets', '[]'::jsonb))
    ) as summaries,
    max(p.length_mode) as pref_mode,
    bool_or(b.video_id is not null) as bookmarked
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
      or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and (
      (v.published_at >= p_from and (p_to is null or v.published_at < p_to) and v.published_at >= cfg.mfloor)
      or (p_with_bookmarked and b.video_id is not null)
    )
  group by v.id, v.channel_id, v.title, v.url, v.published_at, v.duration_seconds
  order by v.published_at desc
  limit 500;
$$;

-- 3) get_digest_dates (캘린더 집계) — published_at >= mfloor
create or replace function public.get_digest_dates()
returns table (channel_id text, kst_date date, cnt int)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select
      coalesce(
        (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
        true
      ) as ex2h,
      coalesce(
        (select mem.created_at from public.membership mem where mem.user_id = (select auth.uid())),
        '-infinity'::timestamptz
      ) as mfloor
  )
  select
    v.channel_id,
    (v.published_at at time zone 'Asia/Seoul')::date as kst_date,
    count(*)::int as cnt
  from public.videos v
  join public.subscriptions sub
    on sub.channel_id = v.channel_id
   and sub.user_id = (select auth.uid())
   and sub.paused = false
  cross join cfg
  where v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and v.published_at >= now() - interval '180 days'
    and v.published_at >= cfg.mfloor
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  group by v.channel_id, (v.published_at at time zone 'Asia/Seoul')::date;
$$;

-- 4) count_period_digests (멤버십 실적) — 하한을 GREATEST(멤버십시작, 주기시작 KST 자정)로. 업로드시점 기준.
create or replace function public.count_period_digests(p_user uuid, p_from date)
returns int
language sql
security definer
set search_path = ''
as $$
  with cfg as (
    select coalesce(
      (select us.exclude_over_2h from public.user_settings us where us.user_id = p_user),
      true
    ) as ex2h
  )
  select count(distinct v.id)::int
  from public.videos v
  join public.subscriptions sub
    on sub.channel_id = v.channel_id
   and sub.user_id = p_user
   and sub.paused = false
  join public.summaries s on s.video_id = v.id and s.language = 'ko'
  cross join cfg
  where v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and v.published_at >= greatest(
      coalesce((select mem.created_at from public.membership mem where mem.user_id = p_user), '-infinity'::timestamptz),
      (p_from::timestamp at time zone 'Asia/Seoul')
    );
$$;

revoke execute on function public.count_period_digests(uuid, date) from public, anon, authenticated;
grant execute on function public.count_period_digests(uuid, date) to service_role;
