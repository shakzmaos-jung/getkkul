-- 친구추천 크레딧 — 원자 트랜잭션 함수 (referral-spec REQ-D/E/F/J, L1/L2)
-- 모든 금액 이동(지급·사용·만료·소멸)은 여기서 단일 트랜잭션 + 행잠금(FOR UPDATE)으로 원자 처리.
-- security definer + search_path='' (모든 객체 스키마 정규화). 실행 권한은 service_role 로 제한.

-- ── activate_and_award: 활성화 판정 + 양방향 지급 (REQ-C/D/E, AC-I1.2) ──
-- 피추천인이 활성화 조건을 충족하면 referral 을 pending→activated 로 1회 전이하고
-- 추천인·피추천인에게 각각 가드 통과분만큼 크레딧을 지급한다. 지급 행(수령자·금액·구분)을 돌려준다.
-- OUT 컬럼명은 credit_grants 컬럼(user_id/amount/source_type)과 충돌하지 않게 award_* 접두.
create or replace function public.activate_and_award(p_referee uuid)
returns table (award_user_id uuid, award_amount int, award_source public.credit_source)
language plpgsql
security definer
set search_path = ''
as $$
declare
  prog         public.referral_program;
  ref          public.referrals;
  channel_cnt  int;
  summary_cnt  int;
  guard_row    public.abuse_guard;
  reward       int;
  expires      timestamptz;
  awarded_sum  int := 0;
  rec_id       uuid;
  rec_src      public.credit_source;
  acquired     int;
  new_grant_id uuid;
begin
  -- 프로그램 단일 행 잠금 → 예산 경합 직렬화(AC-E1.4).
  select * into prog from public.referral_program where id = 1 for update;
  if not found or not prog.active then
    return;
  end if;

  -- 대상 referral 잠금(pending 만). 이미 activated/void 면 멱등적으로 종료(AC-D1.4).
  select * into ref from public.referrals
    where referee_user_id = p_referee and status = 'pending'
    for update;
  if not found then
    return;
  end if;

  -- 활성화 조건: 채널 구독 ≥ 3 AND 수신 요약 항목(=sent delivery 고유 영상 수) ≥ 10 (AC-C1.1/C1.2).
  select count(*) into channel_cnt from public.subscriptions where public.subscriptions.user_id = p_referee;
  select count(*) into summary_cnt from public.deliveries
    where public.deliveries.user_id = p_referee and status = 'sent';
  if channel_cnt < 3 or summary_cnt < 10 then
    return; -- 아직 미충족 → pending 유지
  end if;

  -- 재가입 어뷰징: 이 정규화 이메일 해시로 과거 보상 발생 → 지급 없이 void (AC-I1.2).
  if ref.referee_email_hash is not null then
    select * into guard_row from public.abuse_guard where email_hash = ref.referee_email_hash;
    if found and guard_row.rewarded_before then
      update public.referrals set status = 'void' where id = ref.id;
      return;
    end if;
  end if;

  reward  := prog.reward_amount;
  expires := now() + make_interval(years => prog.validity_years);

  -- 양측 개별 지급(AC-E1.3). 각각 1인 상한→예산 순으로 가드.
  for rec_id, rec_src in
    select ref.referrer_user_id, 'referrer'::public.credit_source
    union all
    select ref.referee_user_id, 'referee'::public.credit_source
  loop
    -- 이 수령자의 추천 획득 누적(모든 credit_grants 는 추천 지급분).
    select coalesce(sum(cg.amount), 0) into acquired
      from public.credit_grants cg where cg.user_id = rec_id;

    -- 1인 상한(AC-E1.1) → 예산 킬스위치(AC-E1.2). 초과 시 이 측만 건너뜀.
    if acquired + reward > prog.per_user_cap then
      continue;
    end if;
    if prog.total_issued + awarded_sum + reward > prog.budget_cap then
      continue;
    end if;

    -- 지급(멱등: (source_referral_id, source_type) UNIQUE).
    insert into public.credit_grants (user_id, amount, remaining_amount, source_type, source_referral_id, expires_at)
    values (rec_id, reward, reward, rec_src, ref.id, expires)
    on conflict (source_referral_id, source_type) do nothing
    returning id into new_grant_id;

    if new_grant_id is not null then
      insert into public.credit_transactions (user_id, grant_id, delta, kind, memo)
      values (rec_id, new_grant_id, reward, 'grant', '친구추천 활성화 지급');
      awarded_sum := awarded_sum + reward;
      award_user_id := rec_id; award_amount := reward; award_source := rec_src;
      return next;
      new_grant_id := null;
    end if;
  end loop;

  -- 프로그램 누적 발행 갱신 + 활성화 전이(AC-C1.3) + 보상 이력 플래그(AC-I1.2).
  if awarded_sum > 0 then
    update public.referral_program set total_issued = total_issued + awarded_sum where id = 1;
  end if;
  update public.referrals set status = 'activated', activated_at = now() where id = ref.id;

  if ref.referee_email_hash is not null then
    insert into public.abuse_guard (email_hash, rewarded_before)
    values (ref.referee_email_hash, true)
    on conflict (email_hash) do update set rewarded_before = true, updated_at = now();
  end if;

  return;
end;
$$;

-- ── use_credits: FIFO 차감 (REQ-F, AC-F2.1/F2.2) ──
-- v1 은 구현·테스트만, 실제 체크아웃 미연동(AC-F2.3). 결제액의 payment_usage_ratio 까지 만료 임박 순 차감.
create or replace function public.use_credits(p_user uuid, p_payment_amount int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  prog       public.referral_program;
  max_usable int;
  need       int;
  used       int := 0;
  g          record;
  take       int;
begin
  select * into prog from public.referral_program where id = 1;
  max_usable := floor(greatest(p_payment_amount, 0) * prog.payment_usage_ratio);
  need := max_usable;
  if need <= 0 then
    return 0;
  end if;

  for g in
    select id, remaining_amount from public.credit_grants
    where public.credit_grants.user_id = p_user
      and status = 'active' and remaining_amount > 0 and expires_at > now()
    order by expires_at asc, granted_at asc
    for update
  loop
    exit when need <= 0;
    take := least(g.remaining_amount, need);
    update public.credit_grants
      set remaining_amount = remaining_amount - take,
          status = case when remaining_amount - take = 0 then 'exhausted' else status end
      where id = g.id;
    insert into public.credit_transactions (user_id, grant_id, delta, kind, memo)
    values (p_user, g.id, -take, 'usage', '결제 크레딧 사용');
    used := used + take;
    need := need - take;
  end loop;

  return used;
end;
$$;

-- ── expire_credits: 만료 처리 (AC-F1.2, L3) ──
-- 만료일 지난 active 로트를 expired 로 전이하고 잔여를 expiry 트랜잭션으로 기록. 스케줄/온디맨드 호출.
create or replace function public.expire_credits()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  g   record;
  cnt int := 0;
begin
  for g in
    select id, user_id, remaining_amount from public.credit_grants
    where status = 'active' and expires_at <= now()
    for update
  loop
    if g.remaining_amount > 0 then
      insert into public.credit_transactions (user_id, grant_id, delta, kind, memo)
      values (g.user_id, g.id, -g.remaining_amount, 'expiry', '유효기간 만료');
    end if;
    update public.credit_grants set remaining_amount = 0, status = 'expired' where id = g.id;
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

-- ── forfeit_user_credits: 탈퇴 시 본인 크레딧 소멸 (AC-J1.1) ──
-- 탈퇴 직전 호출. 본인 active 로트를 forfeited 로, 잔여를 forfeit 트랜잭션으로 기록.
-- 추천인 측 지급(다른 user_id 행)은 건드리지 않음 → 유지(AC-J1.3).
create or replace function public.forfeit_user_credits(p_user uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  g   record;
  cnt int := 0;
begin
  for g in
    select id, remaining_amount from public.credit_grants
    where public.credit_grants.user_id = p_user and status = 'active'
    for update
  loop
    if g.remaining_amount > 0 then
      insert into public.credit_transactions (user_id, grant_id, delta, kind, memo)
      values (p_user, g.id, -g.remaining_amount, 'forfeit', '탈퇴로 소멸');
    end if;
    update public.credit_grants set remaining_amount = 0, status = 'forfeited' where id = g.id;
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

-- 실행 권한: 정의자 권한 함수(RLS 우회 + 임의 user_id 인자)이므로 anon/authenticated/public
-- 모두에서 실행을 박탈하고 service_role 만 허용(L4). Supabase 기본 권한이 anon/authenticated 에
-- EXECUTE 를 부여하므로 public 만 revoke 하면 부족하다 → 세 역할 모두 명시적으로 revoke.
revoke execute on function public.activate_and_award(uuid) from public, anon, authenticated;
revoke execute on function public.use_credits(uuid, int) from public, anon, authenticated;
revoke execute on function public.expire_credits() from public, anon, authenticated;
revoke execute on function public.forfeit_user_credits(uuid) from public, anon, authenticated;
grant execute on function public.activate_and_award(uuid) to service_role;
grant execute on function public.use_credits(uuid, int) to service_role;
grant execute on function public.expire_credits() to service_role;
grant execute on function public.forfeit_user_credits(uuid) to service_role;
