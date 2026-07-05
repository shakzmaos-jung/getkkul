-- 영상별·사용자별 요약 길이 선택 저장 (다이제스트 카드별 길이 override).
-- default 는 user_settings.summary_length 를 따르고, 이 테이블에 기록이 있으면 그 최신값을 사용.
create table if not exists public.user_video_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  length_mode public.summary_length not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

alter table public.user_video_prefs enable row level security;

-- 본인 행만 접근 (user_id = auth.uid())
create policy "user_video_prefs_own"
  on public.user_video_prefs
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
