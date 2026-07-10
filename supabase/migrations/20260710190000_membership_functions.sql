-- 멤버십 트랜잭션 RPC (membership-spec §C/D/E). 날짜 계산은 TS(테스트됨)에서 하고
-- 계산값을 인자로 받아 원자적 DB 쓰기·크레딧 차감(use_credits)만 여기서 보장한다.
-- 전부 SECURITY DEFINER + service_role 전용(서버 액션은 admin 클라이언트로 호출).

-- 부트스트랩: 멤버십 없으면 생성(계산값 주입), 있으면 무시. 현재 주기 usage 행 보장.
create or replace function public.membership_bootstrap(
  p_user uuid,
  p_plan public.membership_plan,
  p_status public.membership_status,
  p_anchor int,
  p_period_start date,
  p_period_end date,
  p_next_billing timestamptz,
  p_poc_free_until timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.membership(
    user_id, plan_code, status, anchor_day, period_start, period_end, next_billing_at, poc_free_until
  ) values (p_user, p_plan, p_status, p_anchor, p_period_start, p_period_end, p_next_billing, p_poc_free_until)
  on conflict (user_id) do nothing;

  insert into public.membership_usage(user_id, period_start)
  select user_id, period_start from public.membership where user_id = p_user
  on conflict (user_id, period_start) do nothing;
end $$;

-- 업그레이드: 즉시 상위 적용 + 비례정산 크레딧 차감(use_credits) + 결제내역. 멱등키로 중복 방지.
create or replace function public.membership_apply_upgrade(
  p_user uuid,
  p_to public.membership_plan,
  p_charge int,          -- 실제 청구액(무PG면 0)
  p_proration_raw int,   -- 기록용 비례정산 원금
  p_idem text,
  p_billing_period text
) returns int language plpgsql security definer set search_path = '' as $$
declare v_credit int := 0;
begin
  if exists (select 1 from public.billing_history where idempotency_key = p_idem) then
    return 0; -- 이미 처리됨(중복 클릭/재실행)
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
  return v_credit;
end $$;

-- 다운그레이드/해지 예약: 다음 주기 적용. p_cancel=true 면 status=canceled(다음 주기 Free).
create or replace function public.membership_schedule_change(
  p_user uuid, p_to public.membership_plan, p_cancel boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.membership
    set scheduled_change = jsonb_build_object('plan_code', p_to::text, 'cancel', p_cancel),
        status = case when p_cancel then 'canceled'::public.membership_status else status end,
        updated_at = now()
    where user_id = p_user;
end $$;

-- 예약 변경 취소(AC-A1.4). 취소였다면 status 복원(PoC 유효 시 poc_free, 아니면 active).
create or replace function public.membership_cancel_scheduled(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.membership
    set scheduled_change = null,
        status = case
          when status = 'canceled' and poc_free_until is not null and now() < poc_free_until
            then 'poc_free'::public.membership_status
          when status = 'canceled' then 'active'::public.membership_status
          else status end,
        updated_at = now()
    where user_id = p_user;
end $$;

-- 사용량 소비 시도(한도 내면 +1 하고 true, 초과면 false). 원자적(조건부 update).
create or replace function public.membership_try_consume(
  p_user uuid, p_period date, p_kind text, p_limit int
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_used int;
begin
  insert into public.membership_usage(user_id, period_start)
  values (p_user, p_period) on conflict (user_id, period_start) do nothing;

  if p_kind = 'digest' then
    update public.membership_usage set digest_used = digest_used + 1, updated_at = now()
      where user_id = p_user and period_start = p_period and digest_used < p_limit
      returning digest_used into v_used;
  elsif p_kind = 'ai' then
    update public.membership_usage set ai_query_used = ai_query_used + 1, updated_at = now()
      where user_id = p_user and period_start = p_period and ai_query_used < p_limit
      returning ai_query_used into v_used;
  else
    return false;
  end if;
  return v_used is not null;
end $$;

revoke execute on function public.membership_bootstrap(uuid, public.membership_plan, public.membership_status, int, date, date, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.membership_apply_upgrade(uuid, public.membership_plan, int, int, text, text) from public, anon, authenticated;
revoke execute on function public.membership_schedule_change(uuid, public.membership_plan, boolean) from public, anon, authenticated;
revoke execute on function public.membership_cancel_scheduled(uuid) from public, anon, authenticated;
revoke execute on function public.membership_try_consume(uuid, date, text, int) from public, anon, authenticated;
grant execute on function public.membership_bootstrap(uuid, public.membership_plan, public.membership_status, int, date, date, timestamptz, timestamptz) to service_role;
grant execute on function public.membership_apply_upgrade(uuid, public.membership_plan, int, int, text, text) to service_role;
grant execute on function public.membership_schedule_change(uuid, public.membership_plan, boolean) to service_role;
grant execute on function public.membership_cancel_scheduled(uuid) to service_role;
grant execute on function public.membership_try_consume(uuid, date, text, int) to service_role;
