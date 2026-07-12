-- 비용·쿼터 (SSR §5.3, AC-CO-1a/b/c). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 일별 요약 토큰 + 이메일 + YouTube 쿼터.
-- USD는 앱에서 가격표(packages/domain/pricing/llm-prices.ts §5.4) × 토큰으로 계산(코드 배포 무관).
create or replace function public.get_cost_breakdown(p_from date default null, p_to date default null)
returns jsonb language sql security definer set search_path = '' as $$
  with r as (select coalesce(p_from,(now() at time zone 'Asia/Seoul')::date - 29) as d_from,
                    coalesce(p_to,(now() at time zone 'Asia/Seoul')::date) as d_to),
  daily as (select (started_at at time zone 'Asia/Seoul')::date as day,
      coalesce(sum((stats->>'prompt_tokens')::bigint),0) as prompt_tokens,
      coalesce(sum((stats->>'completion_tokens')::bigint),0) as completion_tokens,
      coalesce(sum((stats->>'calls')::bigint),0) as calls
    from public.pipeline_runs, r
    where kind='summarize' and (started_at at time zone 'Asia/Seoul')::date between r.d_from and r.d_to
    group by 1),
  email as (select count(*) filter (where status='sent' and channel='email') as sent,
      count(*) filter (where status='failed' and channel='email') as failed
    from public.deliveries, r where (created_at at time zone 'Asia/Seoul')::date between r.d_from and r.d_to)
  select jsonb_build_object('model','gpt-5-nano',
    'from',(select d_from from r),'to',(select d_to from r),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('day',day,'promptTokens',prompt_tokens,'completionTokens',completion_tokens,'calls',calls) order by day),'[]'::jsonb) from daily),
    'totals',(select jsonb_build_object('promptTokens',coalesce(sum(prompt_tokens),0),'completionTokens',coalesce(sum(completion_tokens),0),'calls',coalesce(sum(calls),0)) from daily),
    'email',(select jsonb_build_object('sent',sent,'failed',failed) from email),
    'quota',jsonb_build_object('day',(now() at time zone 'Asia/Seoul')::date,
      'unitsUsed',coalesce((select units_used from public.search_api_usage where day=(now() at time zone 'Asia/Seoul')::date),0),
      'cap',coalesce((select cap from public.search_api_usage where day=(now() at time zone 'Asia/Seoul')::date),(select cap from public.search_api_usage order by day desc limit 1),2000)));
$$;
revoke all on function public.get_cost_breakdown(date,date) from public, anon, authenticated;
grant execute on function public.get_cost_breakdown(date,date) to service_role;
