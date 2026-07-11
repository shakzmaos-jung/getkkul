-- 홈 가치 히어로: 기간(이번달) 다이제스트의 영상 수·원본 영상 초 합계·본문 글자수 합계 집계.
-- get_feed_digests 와 동일 자격조건(구독 paused=false·done·길이필터·멤버십 게시 하한·ko 요약).
-- read_chars 는 지정 모드(p_mode)의 core_text 공백제외 글자수 합. SECURITY INVOKER(호출자 RLS).
create or replace function public.get_month_value_stats(p_from timestamptz, p_mode text default 'normal')
returns table (video_count int, video_seconds bigint, read_chars bigint)
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
    select
      v.id,
      v.duration_seconds,
      length(regexp_replace(coalesce(sm.core_text, ''), '\s', '', 'g')) as chars
    from public.videos v
    join public.subscriptions sub
      on sub.channel_id = v.channel_id
     and sub.user_id = (select auth.uid())
     and sub.paused = false
    join public.summaries sm
      on sm.video_id = v.id
     and sm.language = 'ko'
     and sm.length_mode = p_mode::public.summary_length
    cross join cfg
    where v.status = 'done'
      and (sub.active_since is null or v.created_at >= sub.active_since)
      and (
        v.duration_seconds is null
        or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
      )
      and v.published_at is not null
      and v.published_at >= p_from
      and v.published_at >= cfg.mfloor
  )
  select
    count(*)::int as video_count,
    coalesce(sum(duration_seconds), 0)::bigint as video_seconds,
    coalesce(sum(chars), 0)::bigint as read_chars
  from q;
$$;

revoke execute on function public.get_month_value_stats(timestamptz, text) from public, anon;
grant execute on function public.get_month_value_stats(timestamptz, text) to authenticated;
