-- 추천 현황 진행률 조회 (REQ-G2). 추천인은 RLS 상 피추천인의 subscriptions/deliveries 를
-- 직접 볼 수 없으므로, 집계 수치(채널 x/3, 요약 y/10)와 상태만 돌려주는 정의자 함수를 둔다.
-- 반환은 referral_id + 카운트 + 상태뿐 — 어떤 채널을 구독했는지 등 상세는 노출하지 않는다(AC-G2.2).
create or replace function public.get_referral_progress()
returns table (
  referral_id  uuid,
  channel_count int,
  summary_count int,
  status       public.referral_status,
  created_at   timestamptz,
  activated_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    r.id,
    (select count(*)::int from public.subscriptions s where s.user_id = r.referee_user_id),
    (select count(*)::int from public.deliveries d
       where d.user_id = r.referee_user_id and d.status = 'sent'),
    r.status,
    r.created_at,
    r.activated_at
  from public.referrals r
  where r.referrer_user_id = (select auth.uid())
  order by r.created_at desc
$$;

-- 본인 추천 목록만 노출하므로 authenticated 실행 허용, anon/public 은 차단.
revoke execute on function public.get_referral_progress() from public, anon;
grant execute on function public.get_referral_progress() to authenticated;
