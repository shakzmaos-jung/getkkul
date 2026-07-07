-- 다이제스트 북마크 (사용자별 저장). RLS: 본인 행만.
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  video_id uuid not null references videos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);
create index idx_bookmarks_user on bookmarks (user_id);

alter table bookmarks enable row level security;
create policy "own bookmarks - select" on bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own bookmarks - insert" on bookmarks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own bookmarks - delete" on bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));
