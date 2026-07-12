-- 관제 홈 데이터 (SSR §5.3, AC-OV-1c). read-only · additive · 서버(service_role) 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 기존 pipeline_health_snapshot() 재사용 +
-- 구독자 집계 추가(중복 금지). 상태 3단계·배치 성공률은 앱(TS, apps/admin/lib/overview/derive.ts)에서 계산.
create or replace function public.get_admin_overview()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'health', public.pipeline_health_snapshot(),
    'subscribers', jsonb_build_object(
      'active', (
        select count(distinct s.user_id)
        from public.subscriptions s
        where s.paused = false and s.active = true
      ),
      'newLast7d', (
        select count(*) from public.profiles p
        where p.created_at >= now() - interval '7 days'
      ),
      'newLast30d', (
        select count(*) from public.profiles p
        where p.created_at >= now() - interval '30 days'
      )
    )
  );
$$;

revoke all on function public.get_admin_overview() from public, anon, authenticated;
grant execute on function public.get_admin_overview() to service_role;
