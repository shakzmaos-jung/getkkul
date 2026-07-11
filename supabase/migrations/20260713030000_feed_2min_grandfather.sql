-- 영상 길이 필터: 다이제스트 노출 하한을 2분(120초)으로 통일하되 **소급 미적용**.
-- 이번 정책 시행 시각(2026-07-13 KST) 이전에 감지된(created_at) 영상은 기존대로 유지해
-- 이미 저장·표시된 1~2분 영상이 사라지지 않게 한다. 이후 감지분부터 2분 미만 제외.
-- 겸사겸사 get_feed_digests 의 두 회귀 복구(20260712010000 에서 유실): (1) 하한 60→120,
-- (2) 멤버십 게시 하한(mfloor) 재적용. (신규 <2분은 요약 게이트 120 으로도 애초에 미생성.)
create or replace function public.get_feed_digests(
  p_from timestamptz,
  p_to timestamptz default null,
  p_with_bookmarked boolean default false
)
returns table (
  id uuid, channel_id text, title text, url text, published_at timestamptz,
  duration_seconds int, summaries jsonb, pref_mode text, bookmarked boolean, feedback jsonb
)
language sql security invoker set search_path = ''
as $$
  with cfg as (
    select
      coalesce((select us.exclude_over_2h from public.user_settings us where us.user_id = (select auth.uid())), true) as ex2h,
      coalesce((select mem.created_at from public.membership mem where mem.user_id = (select auth.uid())), '-infinity'::timestamptz) as mfloor
  )
  select
    v.id, v.channel_id, v.title, v.url, v.published_at, v.duration_seconds,
    jsonb_object_agg(
      s.length_mode,
      jsonb_build_object('coreText', coalesce(s.core_text, ''), 'body', coalesce(s.body, '{}'::jsonb))
    ) as summaries,
    max(p.length_mode) as pref_mode,
    bool_or(b.video_id is not null) as bookmarked,
    (select jsonb_object_agg(cf.length_mode, cf.rating)
     from public.content_feedback cf
     where cf.video_id = v.id and cf.user_id = (select auth.uid()) and cf.language = 'ko') as feedback
  from public.videos v
  join public.subscriptions sub
    on sub.channel_id = v.channel_id and sub.user_id = (select auth.uid()) and sub.paused = false
  join public.summaries s on s.video_id = v.id and s.language = 'ko'
  left join public.user_video_prefs p on p.video_id = v.id and p.user_id = (select auth.uid())
  left join public.bookmarks b on b.video_id = v.id and b.user_id = (select auth.uid())
  cross join cfg
  where v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (
        -- 2분 하한(소급 미적용): 정책 이전 감지분은 유지, 이후 감지분은 120초 이상만
        (v.created_at < '2026-07-13T00:00:00+09:00'::timestamptz or v.duration_seconds >= 120)
        and (cfg.ex2h = false or v.duration_seconds < 7200)
      )
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

revoke execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.get_feed_digests(timestamptz, timestamptz, boolean) to authenticated;

-- user_settings 컬럼 주석도 2분 기준으로 갱신(정책 문구 일관).
comment on column public.user_settings.exclude_over_2h is
  '2시간 이상 영상 다이제스트 제외(기본 true, 사용자 토글). 2분 미만은 항상 제외(비저장).';
