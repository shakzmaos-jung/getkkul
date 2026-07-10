-- 주기 전환 RPC (membership-spec §B/D2/E/F). 잡(TS)이 planNextCycle 결정을 받아 원자 적용.

-- 플랜별 채널 한도(SQL 단일 소스 — 채널 재조정용).
create or replace function public.plan_channel_limit(p_plan public.membership_plan)
returns int language sql immutable set search_path = '' as $$
  select case p_plan
    when 'free' then 5 when 'small' then 10 when 'medium' then 20 when 'large' then 30 end;
$$;

-- 채널 재조정(AC-D2): 활성 초과분은 오래된 것부터 비활성(보관), 여유분은 최근 비활성분부터 재활성.
create or replace function public.membership_reconcile_channels(p_user uuid, p_limit int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.subscriptions set active = false
  where id in (
    select id from (
      select id, row_number() over (order by created_at desc) rn
      from public.subscriptions where user_id = p_user and active = true
    ) t where rn > p_limit
  );
  update public.subscriptions set active = true
  where id in (
    select id from (
      select id, row_number() over (order by created_at desc) rn
      from public.subscriptions where user_id = p_user and active = false
    ) t
    where rn <= p_limit - (select count(*) from public.subscriptions where user_id = p_user and active = true)
  );
end $$;

-- 주기 롤오버/유예만료: 새 주기 적용 + (무PG면 0)크레딧 차감 + 결제내역(멱등) + 사용량 리셋 + 채널 재조정.
create or replace function public.membership_advance_period(
  p_user uuid,
  p_new_plan public.membership_plan,
  p_new_status public.membership_status,
  p_period_start date,
  p_period_end date,
  p_next_billing timestamptz,
  p_charge int,
  p_billing_status public.billing_status,
  p_channel_limit int,
  p_idem text,
  p_clear_poc boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare v_credit int := 0;
begin
  if exists (select 1 from public.billing_history where idempotency_key = p_idem) then
    return; -- 멱등: 이미 처리된 주기
  end if;
  if p_charge > 0 then
    v_credit := public.use_credits(p_user, p_charge);
  end if;
  update public.membership set
    plan_code = p_new_plan, status = p_new_status,
    period_start = p_period_start, period_end = p_period_end, next_billing_at = p_next_billing,
    scheduled_change = null, grace_until = null,
    poc_free_until = case when p_clear_poc then null else poc_free_until end,
    updated_at = now()
  where user_id = p_user;
  insert into public.billing_history(
    user_id, billing_period, plan_code, amount, credit_used, status, idempotency_key, memo
  ) values (p_user, p_period_start::text, p_new_plan, p_charge, v_credit, p_billing_status, p_idem, 'cycle rollover');
  insert into public.membership_usage(user_id, period_start)
  values (p_user, p_period_start) on conflict (user_id, period_start) do nothing;
  perform public.membership_reconcile_channels(p_user, p_channel_limit);
end $$;

-- PoC 종료 전환: poc_free → active(무PG 0원이라 Medium 유지). 상태만 전환(주기 유지).
create or replace function public.membership_poc_end(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.membership set status = 'active', poc_free_until = null, updated_at = now()
  where user_id = p_user and status = 'poc_free';
end $$;

-- 즉시 업그레이드에도 채널 재활성 반영(상위로 오르면 비활성분 복구, AC-D2.3).
create or replace function public.membership_apply_upgrade(
  p_user uuid,
  p_to public.membership_plan,
  p_charge int,
  p_proration_raw int,
  p_idem text,
  p_billing_period text
) returns int language plpgsql security definer set search_path = '' as $$
declare v_credit int := 0;
begin
  if exists (select 1 from public.billing_history where idempotency_key = p_idem) then
    return 0;
  end if;
  if p_charge > 0 then
    v_credit := public.use_credits(p_user, p_charge);
  end if;
  update public.membership
    set plan_code = p_to, scheduled_change = null, status =
      case when status = 'canceled' then 'active'::public.membership_status else status end,
      updated_at = now()
    where user_id = p_user;
  insert into public.billing_history(
    user_id, billing_period, plan_code, amount, credit_used, status, idempotency_key, memo
  ) values (p_user, p_billing_period, p_to, p_proration_raw, v_credit, 'proration', p_idem, 'upgrade proration');
  perform public.membership_reconcile_channels(p_user, public.plan_channel_limit(p_to));
  return v_credit;
end $$;

revoke execute on function public.plan_channel_limit(public.membership_plan) from public, anon;
revoke execute on function public.membership_reconcile_channels(uuid, int) from public, anon, authenticated;
revoke execute on function public.membership_advance_period(uuid, public.membership_plan, public.membership_status, date, date, timestamptz, int, public.billing_status, int, text, boolean) from public, anon, authenticated;
revoke execute on function public.membership_poc_end(uuid) from public, anon, authenticated;
grant execute on function public.membership_reconcile_channels(uuid, int) to service_role;
grant execute on function public.membership_advance_period(uuid, public.membership_plan, public.membership_status, date, date, timestamptz, int, public.billing_status, int, text, boolean) to service_role;
grant execute on function public.membership_poc_end(uuid) to service_role;
