-- Vercel 함수 keep-warm (plan F3, 사용자 승인).
-- 개인 서비스라 유휴가 잦아 콜드 스타트(~1.6s)가 메뉴 이동 체감을 해친다.
-- pg_cron + pg_net 으로 5분마다 프로덕션을 가볍게 GET → 인스턴스 웜 유지(비용 ~0).
-- 비인증 '/' 는 proxy 가 /login 307 으로 응답 = Node 함수(프록시+렌더러) 웜업에 충분.

select cron.schedule(
  'keepwarm_vercel',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://getkkul.vercel.app/',
    headers := '{"user-agent": "getkkul-keepwarm"}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);
