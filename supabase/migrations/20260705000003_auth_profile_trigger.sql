-- 신규 가입 시 profiles + user_settings 자동 생성 (SSR AC-A1.2 / A1.3)
-- auth.users insert 트리거. 재로그인 시 중복 방지는 on conflict do nothing 으로 보강
-- (auth.users insert 는 최초 가입 1회뿐이라 근본적으로 중복이 없음).
-- security definer + search_path='' → 모든 객체를 스키마 정규화하여 참조.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
