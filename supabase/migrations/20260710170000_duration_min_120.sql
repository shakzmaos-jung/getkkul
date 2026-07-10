-- 다이제스트 길이 하한 60초 → 120초 (2분 미만 제외).
-- 1분 넘는 숏츠가 필터를 통과해 짧은 영상 요약 품질이 낮은 문제. 하한을 2분으로 상향.
-- 이미 적용된 4개 RPC 를 create or replace 로 재정의(>= 60 → >= 120). 상한 < 7200 유지.
-- TS(MIN_DIGEST_DURATION_SEC=120)·summarize-pending(.gte 120)·발송 필터와 임계값을 일치시킨다.

-- 1) get_digest_summary (오늘/누적 카운트)
create or replace function public.get_digest_summary()
returns table (today_count int, total_count int)
language sql
security invoker
set search_path = ''
as $$
  with cfg as (
    select coalesce(
      (select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())),
      true
    ) as ex2h
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
      and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  )
  select
    count(*) filter (
      where (published_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    )::int as today_count,
    count(*)::int as total_count
  from q;
$$;

-- 2) get_today_digests (홈 오늘 목록)
create or replace function public.get_today_digests()
returns table (id uuid, channel_id text, title text, published_at timestamptz)
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
  select v.id, v.channel_id, v.title, v.published_at
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
    and (v.published_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  order by v.published_at desc;
$$;

-- 3) get_feed_digests (피드 카드)
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
      (v.published_at >= p_from and (p_to is null or v.published_at < p_to))
      or (p_with_bookmarked and b.video_id is not null)
    )
  group by v.id, v.channel_id, v.title, v.url, v.published_at, v.duration_seconds
  order by v.published_at desc
  limit 500;
$$;

-- 4) get_digest_dates (캘린더 집계)
create or replace function public.get_digest_dates()
returns table (channel_id text, kst_date date, cnt int)
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
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  group by v.channel_id, (v.published_at at time zone 'Asia/Seoul')::date;
$$;
