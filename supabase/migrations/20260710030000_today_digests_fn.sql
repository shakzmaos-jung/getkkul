-- 홈 "오늘의 다이제스트" 목록(오늘 KST, 개수 제한 없음).
-- get_digest_summary 의 today 필터 + get_recent_digests 의 반환 형태를 합친 것.
-- 다이제스트 조건은 피드/집계와 동일: done + 내 활성 구독 + 기준선 + 길이필터 + ko 요약.
-- SECURITY INVOKER(기본): 호출자 RLS 적용(본인 구독/설정만). search_path='' 로 스키마 정규화.

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
      or (v.duration_seconds >= 60 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at is not null
    and (v.published_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date
    and exists (select 1 from public.summaries sm where sm.video_id = v.id and sm.language = 'ko')
  order by v.published_at desc;
$$;

revoke execute on function public.get_today_digests() from public, anon;
grant execute on function public.get_today_digests() to authenticated;
