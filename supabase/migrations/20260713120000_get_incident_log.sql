-- 알림·인시던트 (SSR §5.3, AC-AL-1a). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 인시던트 소스: 현재 이상 신호
-- (pipeline_health_snapshot 재사용) + 최근 실패 기록(pipeline_runs). 인시던트 테이블은 미신설(파생)
-- — 이력/포스트모템/열림·닫힘 추적은 후속(사용자 결정 2026-07-12).
create or replace function public.get_incident_log(p_days int default 7)
returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'health', public.pipeline_health_snapshot(),
    'windowDays', p_days,
    'recentFailures', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', kind, 'error', left(coalesce(stats->>'error',''), 200),
        'atKst', to_char(created_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI')
      ) order by created_at desc), '[]'::jsonb)
      from (select kind, stats, created_at from public.pipeline_runs
            where ok=false and created_at >= now() - make_interval(days => p_days)
            order by created_at desc limit 50) t)
  );
$$;
revoke all on function public.get_incident_log(int) from public, anon, authenticated;
grant execute on function public.get_incident_log(int) to service_role;
