-- 발송 대상 선별을 서버측으로 이관(오탐 "새 소식 없음" 버그 수정).
-- 기존 발송 경로(candidateVideos)는 videos 를 published_at 오름차순·무제한으로 클라이언트
-- 조회 → 과거 백카탈로그가 done 으로 불어나면 신규 콘텐츠가 PostgREST 행 상한(≈1000) 밖으로
-- 절단되어 [] 반환 → 준비된 콘텐츠가 있어도 "새 소식 없음" 발송. 정상 동작하는 피드
-- (get_feed_digests)와 동일한 서버측 필터 규칙을 발송 문맥(service_role·특정 사용자)으로 옮긴다.
--
-- candidateVideos 와 동치:
--   - status='done' + 비일시정지 구독 채널
--   - active_since 이후(isAfterActiveSince) + 길이필터(passesDurationFilters: 2분↑, 옵션 2시간↓)
--   - 멤버십 게시 하한(published_at >= membership.created_at; 멤버십 없으면 -infinity)
--   - 사용자 요약(length_mode=p_mode, ko) 존재(INNER JOIN)
--   - 아직 sent 아님(NOT EXISTS deliveries)
-- 오래된 순 유지(슬롯마다 재실행하며 적체 소진), limit 60 으로 RPC 반환도 행 상한 아래로 고정.
-- security definer + service_role 전용(count_period_digests 패턴).

create or replace function public.get_deliverable_videos(p_user uuid, p_mode text)
returns table (
  video_id uuid,
  title text,
  url text,
  headline text,
  core_text text,
  duration_seconds int
)
language sql
security definer
set search_path = ''
as $$
  with cfg as (
    select
      coalesce(
        (select us.exclude_over_2h from public.user_settings us where us.user_id = p_user),
        true
      ) as ex2h,
      coalesce(
        (select mem.created_at from public.membership mem where mem.user_id = p_user),
        '-infinity'::timestamptz
      ) as mfloor
  )
  select
    v.id,
    v.title,
    v.url,
    coalesce(s.headline, v.title) as headline,
    coalesce(s.core_text, '') as core_text,
    v.duration_seconds
  from public.videos v
  join public.subscriptions sub
    on sub.channel_id = v.channel_id
   and sub.user_id = p_user
   and sub.paused = false
  join public.summaries s
    on s.video_id = v.id
   and s.length_mode = p_mode::public.summary_length
   and s.language = 'ko'
  cross join cfg
  where v.status = 'done'
    and (sub.active_since is null or v.created_at >= sub.active_since)
    and (
      v.duration_seconds is null
      or (v.duration_seconds >= 120 and (cfg.ex2h = false or v.duration_seconds < 7200))
    )
    and v.published_at >= cfg.mfloor
    and not exists (
      select 1 from public.deliveries d
      where d.user_id = p_user and d.video_id = v.id and d.status = 'sent'
    )
  order by v.published_at asc
  limit 60;
$$;

revoke execute on function public.get_deliverable_videos(uuid, text) from public, anon, authenticated;
grant  execute on function public.get_deliverable_videos(uuid, text) to service_role;
