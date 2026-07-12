-- 운영 데이터 (SSR §5.3, AC-OP-1a). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 구독자 목록(멤버십·활성구독수) + 다이제스트 이력.
-- 이메일은 앱에서 maskEmail(packages/domain)로 마스킹 표시(원문은 서버 fetch 레이어에서만).
-- 수동 실행·재발송(파괴적 액션 AC-OP-1b)은 미포함 — 후속(사용자 결정 2026-07-12: 조회만 먼저).
create or replace function public.get_ops_data(p_digest_limit int default 30)
returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'subscribers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'email', p.email,
        'signupAt', to_char(p.created_at at time zone 'Asia/Seoul','YYYY-MM-DD'),
        'activeSubs', (select count(*) from public.subscriptions s where s.user_id=p.id and s.paused=false and s.active=true),
        'membership', (select m.status::text from public.membership m where m.user_id=p.id)
      ) order by p.created_at), '[]'::jsonb)
      from public.profiles p),
    'recentDigests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'email', p.email, 'title', v.title, 'slot', d.slot::text,
        'channel', d.channel::text, 'status', d.status::text,
        'atKst', to_char(d.created_at at time zone 'Asia/Seoul','MM-DD HH24:MI')
      ) order by d.created_at desc), '[]'::jsonb)
      from (select * from public.deliveries order by created_at desc limit p_digest_limit) d
      join public.videos v on v.id=d.video_id
      join public.profiles p on p.id=d.user_id)
  );
$$;
revoke all on function public.get_ops_data(int) from public, anon, authenticated;
grant execute on function public.get_ops_data(int) to service_role;
