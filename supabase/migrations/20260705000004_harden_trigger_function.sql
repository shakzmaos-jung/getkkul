-- handle_new_user() 하드닝 (security advisor 0028/0029)
-- SECURITY DEFINER 함수가 PostgREST RPC(/rest/v1/rpc/handle_new_user)로 노출되어
-- anon/authenticated 가 직접 호출 가능한 상태였다. 이 함수는 트리거 전용이므로
-- EXECUTE 권한을 회수한다. 트리거 실행에는 영향이 없다(트리거는 정의자 권한으로 동작).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
