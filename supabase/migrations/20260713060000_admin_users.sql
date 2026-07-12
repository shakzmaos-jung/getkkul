-- 관제 어드민 접근 허용목록 + 역할 (SSR §5.1, ADR-A3). additive · read-layer.
-- 적용: 2026-07-12, getkkul 프로젝트(xgmiehptzafgiasmizaa), DB migration version 20260712075326.
-- M1 범위: master 단독. sub_master 초대(admin_invitations)는 후속(사용자 결정 2026-07-12).
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('master','sub_master')),
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- 조회는 본인 행만 (IDOR 방지). 쓰기 정책 없음 → service_role(서버)만 기록/수정.
drop policy if exists "admin_users self read" on public.admin_users;
create policy "admin_users self read"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- master 시드 (Chess = shakzmaos@gmail.com). 이미 있으면 무시.
insert into public.admin_users (user_id, role)
select id, 'master'
from auth.users
where email = 'shakzmaos@gmail.com'
on conflict (user_id) do nothing;
