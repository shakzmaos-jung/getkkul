-- 멤버십 다운그레이드 시 초과 채널을 삭제가 아닌 "사유 있는 일시정지"로 처리(ADR-0015).
-- 기존 active(멤버십 자동) ↔ paused(수동) 이원화 + active 미필터 gap 을 paused+사유로 일원화한다.
-- 피드/발송은 이미 paused=false 만 노출 → 다운그레이드 정지 채널이 실제로 제외된다.

do $$ begin
  create type pause_reason as enum ('manual', 'downgrade');
exception when duplicate_object then null; end $$;

alter table public.subscriptions
  add column if not exists pause_reason pause_reason;

-- 백필: 기존 수동 정지 → 'manual'
update public.subscriptions set pause_reason = 'manual' where paused = true and pause_reason is null;
-- 백필: 예전 자동 비활성(active=false, 미정지) → 정지+downgrade 로 정합화(노출 gap 해소)
update public.subscriptions
  set paused = true, pause_reason = 'downgrade'
  where active = false and paused = false;

-- 채널 재조정(다운=초과분 자동정지 / 업=자동정지분 복원). active 는 paused 와 동기화(레거시 호환).
create or replace function public.membership_reconcile_channels(p_user uuid, p_limit int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- 초과분: 수신중(paused=false) 채널 중 오래된 것부터 자동 정지(downgrade)
  update public.subscriptions
    set paused = true, active = false, pause_reason = 'downgrade'
  where id in (
    select id from (
      select id, row_number() over (order by created_at desc) rn
      from public.subscriptions where user_id = p_user and paused = false
    ) t where rn > p_limit
  );
  -- 여유분: 다운그레이드로 정지된 채널만 최근순 자동 복원(수동 정지는 제외). 복원 시 기준선 갱신.
  update public.subscriptions
    set paused = false, active = true, pause_reason = null, active_since = now()
  where id in (
    select id from (
      select id, row_number() over (order by created_at desc) rn
      from public.subscriptions
      where user_id = p_user and paused = true and pause_reason = 'downgrade'
    ) t
    where rn <= p_limit - (select count(*) from public.subscriptions where user_id = p_user and paused = false)
  );
end $$;
