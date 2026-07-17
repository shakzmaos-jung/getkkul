-- 어드민 멤버십 이력 조회 RPC(조회 전용). billing_history ⋈ profiles(email) ⋈ membership(현재 플랜·상태).
-- billing_history RLS 는 소유자 전용이므로 어드민은 service_role SECURITY DEFINER 로만 전체 조회.
create or replace function public.get_membership_history(
  p_status text default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path = '' as $$
  with filtered as (
    select b.id, p.email, b.billing_period, b.plan_code::text as plan_code, b.amount, b.credit_used,
      b.status::text as status, b.memo, b.created_at,
      m.plan_code::text as current_plan, m.status::text as current_status
    from public.billing_history b
    join public.profiles p on p.id = b.user_id
    left join public.membership m on m.user_id = b.user_id
    where (p_status is null or b.status::text = p_status)
      and (p_search is null or p_search = '' or p.email ilike '%' || p_search || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'email', page.email,
        'billingPeriod', page.billing_period,
        'planCode', page.plan_code,
        'amount', page.amount,
        'creditUsed', page.credit_used,
        'status', page.status,
        'memo', page.memo,
        'currentPlan', page.current_plan,
        'currentStatus', page.current_status,
        'atKst', to_char(page.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
      ) order by page.created_at desc)
      from (select * from filtered order by created_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_membership_history(text, text, int, int) from public, anon, authenticated;
grant execute on function public.get_membership_history(text, text, int, int) to service_role;
