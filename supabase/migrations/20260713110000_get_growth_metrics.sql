-- 그로스 (SSR §5.3, AC-GR-1a/b). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 구독자·신규가입·퍼널·활성화(발송 기준)·
-- 코호트 리텐션(구독 유지 proxy)·레퍼럴 킬스위치(referral_program 재사용).
-- 이탈 미추적(계정 삭제 흔적 없음), 오픈 기반 지표는 발송/구독 유지 proxy(사용자 결정 2026-07-12).
create or replace function public.get_growth_metrics()
returns jsonb language sql security definer set search_path = '' as $$
  with subs as (select count(distinct user_id) filter (where paused=false and active=true) as active from public.subscriptions),
  signups as (select count(*) as total,
      count(*) filter (where created_at >= now() - interval '7 days') as last7d,
      count(*) filter (where created_at >= now() - interval '30 days') as last30d from public.profiles),
  funnel as (select (select count(*) from public.profiles) as signed_up,
      (select count(distinct user_id) from public.subscriptions where paused=false and active=true) as subscribed,
      (select count(distinct user_id) from public.deliveries where status='sent') as delivered),
  cohorts as (select date_trunc('week', p.created_at at time zone 'Asia/Seoul')::date as cohort_week, count(*) as size,
      count(*) filter (where exists (select 1 from public.subscriptions s where s.user_id=p.id and s.paused=false and s.active=true)) as still_active
    from public.profiles p group by 1),
  referral as (select rp.total_issued, rp.budget_cap, rp.per_user_cap, rp.reward_amount, rp.active,
      (select count(*) from public.referrals) as total_referrals,
      (select count(*) from public.referrals where status='activated') as activated
    from public.referral_program rp limit 1)
  select jsonb_build_object(
    'subscribers', jsonb_build_object('active',(select active from subs),'newLast7d',(select last7d from signups),
      'newLast30d',(select last30d from signups),'totalSignups',(select total from signups)),
    'funnel',(select jsonb_build_object('signedUp',signed_up,'subscribed',subscribed,'delivered',delivered) from funnel),
    'activation',(select jsonb_build_object('signups',signed_up,'delivered',delivered,
      'rate',case when signed_up>0 then round(delivered::numeric/signed_up,4) else null end) from funnel),
    'cohorts',(select coalesce(jsonb_agg(jsonb_build_object('week',cohort_week,'size',size,'stillActive',still_active,
      'retentionRate',case when size>0 then round(still_active::numeric/size,4) else null end) order by cohort_week),'[]'::jsonb) from cohorts),
    'referral',(select jsonb_build_object('totalIssued',total_issued,'budgetCap',budget_cap,'perUserCap',per_user_cap,
      'rewardAmount',reward_amount,'active',active,'totalReferrals',total_referrals,'activated',activated,
      'soakRate',case when budget_cap>0 then round(total_issued::numeric/budget_cap,6) else null end) from referral));
$$;
revoke all on function public.get_growth_metrics() from public, anon, authenticated;
grant execute on function public.get_growth_metrics() to service_role;
