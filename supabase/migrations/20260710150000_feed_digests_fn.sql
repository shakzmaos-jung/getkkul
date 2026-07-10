-- 피드 데이터 1왕복화 (메뉴 이동 성능, plan F1).
-- 기존: videos(800) → summaries 청크(≤8) → prefs/bookmarks 청크 = 4단계 직렬 왕복.
-- 개선: 요약 3모드·길이선택·북마크를 서버 조인으로 합쳐 단일 RPC 로 반환.
-- 다이제스트 조건은 get_today_digests/get_digest_summary 와 동일(피드 표시 규칙의 단일 진실).
-- SECURITY INVOKER: 호출자 RLS(본인 구독/설정/선택/북마크만). search_path='' 정규화.

-- 1) 기간(또는 북마크 포함) 다이제스트 카드 데이터.
--    p_to null = 초기 로드(p_from 이후 전부 + p_with_bookmarked 로 창 밖 북마크 포함).
--    p_to 지정 = 특정 일자 온디맨드 조회(하이브리드).
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

-- 2) 캘린더용 경량 일자별 집계(요약 있는 done 만, 채널필터 재집계 호환).
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
      or (v.duration_seconds >= 60 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and v.published_at >= now() - interval '180 days'
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  group by v.channel_id, (v.published_at at time zone 'Asia/Seoul')::date;
$$;

revoke execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) from public, anon;
revoke execute on function public.get_digest_dates() from public, anon;
grant execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) to authenticated;
grant execute on function public.get_digest_dates() to authenticated;
