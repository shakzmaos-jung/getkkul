-- 좋아요/싫어요 이벤트 이력(추가전용) + 어드민 조회 RPC.
-- content_feedback(현재 상태·upsert)와 별개로, 사용자가 반응을 표할 때마다 한 줄씩 영구 누적한다.
-- 싫어요 사유(reason)도 여기 보존 → 나중에 토글/변경해도 과거 이벤트가 남는다.
-- enum feedback_rating / summary_length / summary_language 는 기존 마이그레이션에서 생성됨(재사용).

create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  length_mode summary_length not null,
  language summary_language not null default 'ko',
  rating feedback_rating not null,                     -- 'up'(좋아요) | 'down'(싫어요)
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists feedback_events_created_idx on public.feedback_events (created_at desc);
create index if not exists feedback_events_rating_idx on public.feedback_events (rating);

alter table public.feedback_events enable row level security;
-- 사용자는 본인 이벤트만 insert/select(타인 이력 조회 불가). 어드민은 service_role RPC 로 전체 조회.
create policy "own feedback_events - insert" on public.feedback_events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own feedback_events - select" on public.feedback_events
  for select to authenticated using (user_id = (select auth.uid()));
grant insert, select on public.feedback_events to authenticated;
grant all on public.feedback_events to service_role;

-- 어드민 조회(필터·검색·페이지네이션). read-only · service_role 전용. 이메일 원문 반환 → fetch 레이어에서 maskEmail.
create or replace function public.get_feedback_events(
  p_rating text default null,        -- 'up' | 'down' | null(전체)
  p_search text default null,        -- 이메일·영상제목·채널·사유 ILIKE
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path='' as $$
  with ch as (
    -- 채널 제목: 구독 메타에서 channel_id 당 대표값(가장 이른 구독). channels 전역 테이블 없음.
    select distinct on (s.channel_id) s.channel_id, s.channel_title
    from public.subscriptions s
    order by s.channel_id, s.created_at
  ),
  filtered as (
    select fe.id, fe.created_at, fe.rating, fe.length_mode, fe.reason,
           p.email, v.title as video_title, ch.channel_title
    from public.feedback_events fe
    join public.videos v on v.id = fe.video_id
    join public.profiles p on p.id = fe.user_id
    left join ch on ch.channel_id = v.channel_id
    where (p_rating is null or fe.rating = p_rating::public.feedback_rating)
      and (p_from is null or fe.created_at >= p_from)
      and (p_to   is null or fe.created_at <  p_to)
      and (
        p_search is null or p_search = '' or
        p.email ilike '%'||p_search||'%' or
        v.title ilike '%'||p_search||'%' or
        coalesce(ch.channel_title,'') ilike '%'||p_search||'%' or
        coalesce(fe.reason,'')        ilike '%'||p_search||'%'
      )
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'atKst', to_char(page.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
        'email', page.email,
        'channelTitle', page.channel_title,
        'videoTitle', page.video_title,
        'rating', page.rating::text,
        'lengthMode', page.length_mode::text,
        'reason', page.reason
      ) order by page.created_at desc)
      from (select * from filtered order by created_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_feedback_events(text, text, timestamptz, timestamptz, int, int) from public, anon, authenticated;
grant execute on function public.get_feedback_events(text, text, timestamptz, timestamptz, int, int) to service_role;
