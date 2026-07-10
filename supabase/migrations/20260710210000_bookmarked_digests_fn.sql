-- 북마크 다이제스트 전용 RPC (성능 회귀 수정).
-- get_feed_digests 의 p_with_bookmarked OR 절이 요약본 증가로 전체 스캔을 유발(132ms) →
-- 북마크 탭은 bookmarks 를 구동 테이블(few rows)로 시작하는 전용 경로로 분리한다.
-- 반환 형태·조건은 get_feed_digests 와 동일(피드 카드 매핑 재사용). SECURITY INVOKER.

create or replace function public.get_bookmarked_digests()
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
    true as bookmarked
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
