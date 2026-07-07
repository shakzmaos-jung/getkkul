-- 추천 현황에 피추천인 이메일 추가 (운영자 요청 — 신뢰 그룹 대상 서비스라 초대 목록에서
-- 이메일·진행률을 직접 확인. 여전히 "어떤 채널을 구독했는지" 등 상세 활동은 노출하지 않음).
-- 반환 컬럼이 바뀌므로 DROP 후 재생성.
drop function if exists public.get_referral_progress();

create or replace function public.get_referral_progress()
returns table (
  referral_id   uuid,
  referee_email text,
  channel_count int,
  summary_count int,
  status        public.referral_status,
  created_at    timestamptz,
  activated_at  timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    r.id,
    (select p.email from public.profiles p where p.id = r.referee_user_id),
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

revoke execute on function public.get_referral_progress() from public, anon;
grant execute on function public.get_referral_progress() to authenticated;
