-- 홈 대시보드 다이제스트 집계를 SQL 로 계산한다.
-- 배경: 기존 홈은 모든 ko 요약(summaries)을 앱으로 가져와 집계했는데, 요약 수가
-- Supabase API max-rows(기본 1000)를 넘으면서 최신 요약이 누락돼 "오늘 다이제스트"가
-- 과소 집계됐다(피드는 대상 영상만 조회해 무관). 카운트를 SQL 로 옮겨 상한 문제를 제거한다.
--
-- 다이제스트 조건(피드 표시와 동일):
--  - videos.status='done' + 내 활성(미정지) 구독 채널
--  - 정지해제 기준선 이후: active_since is null or v.created_at >= active_since
--  - 길이 필터: 길이 null 통과, 60초 미만 제외, exclude_over_2h면 7200초 이상 제외
--  - ko 요약 존재
-- SECURITY INVOKER(기본): 호출자 RLS 적용(본인 구독/설정만). search_path='' 로 스키마 정규화.

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
        or (v.duration_seconds >= 60 and (cfg.ex2h = false or v.duration_seconds < 7200))
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

create or replace function public.get_recent_digests(p_limit int default 5)
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
      or (v.duration_seconds >= 60 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  order by v.published_at desc
  limit greatest(p_limit, 0);
$$;

revoke execute on function public.get_digest_summary() from public, anon;
revoke execute on function public.get_recent_digests(int) from public, anon;
grant execute on function public.get_digest_summary() to authenticated;
grant execute on function public.get_recent_digests(int) to authenticated;
