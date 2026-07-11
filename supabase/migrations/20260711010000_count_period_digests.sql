-- 멤버십 '다이제스트 실적' = 사용자가 이번 주기에 피드에서 보는 다이제스트 수.
-- get_feed_digests 와 동일한 기준(활성(비정지) 구독 · ko 요약 보유 · status=done · 길이필터
-- · active_since 윈도우 · exclude_over_2h)으로 KST 게시일이 p_from(주기 시작일) 이상인 것을 센다.
-- 발송(deliveries)이 아니라 '보이는 콘텐츠'가 실적의 진실원이다.
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
    and (v.published_at at time zone 'Asia/Seoul')::date >= p_from;
$$;

-- 서버(서비스롤)에서 특정 사용자 기준으로만 호출한다. 직접 호출(임의 p_user) 차단.
revoke execute on function public.count_period_digests(uuid, date) from public, anon, authenticated;
grant execute on function public.count_period_digests(uuid, date) to service_role;
