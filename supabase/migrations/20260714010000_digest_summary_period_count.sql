-- 홈 히어로 하단 통계: '이번달 누적 영상'(현재 멤버십 주기 누적) 지원.
-- get_digest_summary() 에 period_count 컬럼 추가. 주기 floor 는 count_period_digests 와 동일한
-- greatest(membership.created_at, period_start@KST자정) → 다음 주기(period_start 갱신) 시 0 리셋.
-- today_count/total_count 는 기존과 동일(회귀 없음). 반환 컬럼 추가라 DROP+CREATE(원자적).
drop function if exists public.get_digest_summary();
create function public.get_digest_summary()
returns table (today_count int, total_count int, period_count int)
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
      ) as mfloor,
      coalesce(
        (select greatest(mem.created_at, (mem.period_start::timestamp at time zone 'Asia/Seoul'))
         from public.membership mem where mem.user_id = (select auth.uid())),
        '-infinity'::timestamptz
      ) as pfloor
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
    count(*)::int as total_count,
    count(*) filter (where published_at >= (select pfloor from cfg))::int as period_count
  from q;
$$;

revoke execute on function public.get_digest_summary() from public, anon;
grant  execute on function public.get_digest_summary() to authenticated, service_role;
