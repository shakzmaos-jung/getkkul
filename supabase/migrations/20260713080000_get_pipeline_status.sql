-- 파이프라인 상태 (SSR §5.3, AC-PI-1a/c). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 4단계 타임라인(발송은 소요시간 미기록 → null,
-- 건수만) + 재시도 큐(영구실패 vs 재시도소진 분리). p_date 기본 = 오늘 KST.
create or replace function public.get_pipeline_status(p_date date default null)
returns jsonb language sql security definer set search_path = '' as $$
  with d as (select coalesce(p_date, (now() at time zone 'Asia/Seoul')::date) as day),
  runs as (select distinct on (kind) kind, stats, ok,
      extract(epoch from (finished_at - started_at))::int as duration_sec
    from public.pipeline_runs, d
    where kind in ('detect','acquire','summarize')
      and (started_at at time zone 'Asia/Seoul')::date = d.day
    order by kind, started_at desc),
  deliver as (select count(*) filter (where status='sent') as delivered,
      count(*) filter (where status='failed') as failures
    from public.deliveries, d where (created_at at time zone 'Asia/Seoul')::date = d.day),
  stage_defs(key,label,ord) as (values ('detect','탐지',1),('acquire','전사',2),('summarize','요약',3),('deliver','발송',4)),
  retry as (select
      count(*) filter (where status='pending' and next_retry_at is not null and next_retry_at <= now()) as due_now,
      count(*) filter (where status='pending' and next_retry_at is not null and next_retry_at > now()) as waiting,
      count(*) filter (where status='failed' and failure_kind='permanent') as permanent_failures,
      count(*) filter (where status='failed' and failure_kind='transient') as exhausted_transient
    from public.videos),
  samples as (select coalesce(jsonb_agg(jsonb_build_object('title',title,'lastError',last_error,
        'failureKind',failure_kind,'retryCount',retry_count,'nextRetryAt',next_retry_at,'status',status)
        order by coalesce(next_retry_at,created_at) desc),'[]'::jsonb) as arr
    from (select title,last_error,failure_kind,retry_count,next_retry_at,status,created_at from public.videos
      where status='failed' or (status='pending' and next_retry_at is not null)
      order by coalesce(next_retry_at,created_at) desc limit 8) t)
  select jsonb_build_object(
    'date',(select day from d),
    'stages',(select jsonb_agg(jsonb_build_object('key',sd.key,'label',sd.label,
        'ok',case when sd.key='deliver' then (select case when delivered=0 and failures=0 then null else failures=0 end from deliver) else r.ok end,
        'durationSec',case when sd.key='deliver' then null else r.duration_sec end,
        'counts',case when sd.key='deliver' then (select jsonb_build_object('delivered',delivered,'failures',failures) from deliver)
          else coalesce(r.stats,'{}'::jsonb) end) order by sd.ord)
      from stage_defs sd left join runs r on r.kind=sd.key),
    'retryQueue',(select jsonb_build_object('dueNow',due_now,'waiting',waiting,
        'permanentFailures',permanent_failures,'exhaustedTransient',exhausted_transient,
        'samples',(select arr from samples)) from retry));
$$;
revoke all on function public.get_pipeline_status(date) from public, anon, authenticated;
grant execute on function public.get_pipeline_status(date) to service_role;
