-- PWA 푸시 구독 저장(SSR 부록 G). 본인 구독만 접근(RLS).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "own push subs - select" on public.push_subscriptions
  for select using (user_id = auth.uid());
create policy "own push subs - insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());
create policy "own push subs - update" on public.push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push subs - delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- user_settings: 슬롯별 푸시 on/off + 빈 슬롯 생략 토글(SSR 부록 G/D).
alter table public.user_settings
  add column if not exists push_slot_0730 boolean not null default false,
  add column if not exists push_slot_1130 boolean not null default false,
  add column if not exists push_slot_1730 boolean not null default false,
  add column if not exists skip_empty_push boolean not null default true,
  add column if not exists skip_empty_email boolean not null default true;

-- 컬럼 레벨 grant 테이블이라 새 컬럼 UPDATE 를 authenticated 에 명시 부여.
grant update (
  push_slot_0730, push_slot_1130, push_slot_1730, skip_empty_push, skip_empty_email
) on public.user_settings to authenticated;
