-- 멤버십 채널 한도 상시 시행(ADR-0015 개정): 한도 초과를 이벤트가 아니라 불변식으로 강제한다.
-- 변경점:
--   1) membership_reconcile_channels 를 "정지 전용"으로 재정의 — 업그레이드 시 자동 복원 반쪽 삭제.
--      (요구사항: 자동정지 채널은 사용자가 상위 플랜에서 직접 수동 해제). 정지 순서 newest-first(오래 구독한 채널 유지).
--   2) membership_enforce_all_limits() 신설 — 전 사용자 한도를 set-based 로 시행(주기 잡이 매 사이클 호출).
-- active 는 paused 와 계속 동기화(분석 RPC 가 active=true 에 의존).

-- (1) 정지 전용 재조정: 초과분만 자동 정지(최근 추가부터), 자동 복원 없음.
--     업그레이드 시엔 한도가 커져 정지 대상 0 → 무동작(자동정지 채널 유지, 사용자가 수동 해제).
create or replace function public.membership_reconcile_channels(p_user uuid, p_limit int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.subscriptions
    set paused = true, active = false, pause_reason = 'downgrade'
  where id in (
    select id from (
      select id, row_number() over (order by created_at asc) rn
      from public.subscriptions where user_id = p_user and paused = false
    ) t where rn > p_limit
  );
end $$;

-- (2) 전 사용자 한도 상시 시행(정지 전용, 멱등). 반환값 = 이번에 새로 정지된 채널 수.
--     구독중(paused=false)이 플랜 한도를 넘는 사용자만, 최신 초과분을 자동 정지한다.
create or replace function public.membership_enforce_all_limits()
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with ranked as (
    select s.id,
      row_number() over (partition by s.user_id order by s.created_at asc) rn,
      public.plan_channel_limit(m.plan_code) lim
    from public.subscriptions s
    join public.membership m on m.user_id = s.user_id
    where s.paused = false
  )
  update public.subscriptions s
    set paused = true, active = false, pause_reason = 'downgrade'
  from ranked r
  where s.id = r.id and r.rn > r.lim;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.membership_enforce_all_limits() from public, anon, authenticated;
grant  execute on function public.membership_enforce_all_limits() to service_role;
