-- 정시 발송(pipeline-reliability 연장): Supabase pg_cron 이 GitHub deliver 워크플로를
-- KST 07:30/11:30/17:30(UTC 22:30/02:30/08:30)에 정확히 dispatch 한다. GitHub 네이티브
-- schedule 크론은 지연(jitter)이 흔해 07:30 잡이 08:34에 발화 → off-slot 발송의 원인이었다.
-- pg_cron 은 DB 서버 시계로 정시 발화하므로 발송이 슬롯 +1-2분에 안착한다.
-- PAT 은 Vault 시크릿 'github_pat'(dispatch_pipeline 과 동일)에서 읽는다(코드에 값 미포함).
-- 시크릿이 없으면 no-op. deliver.yml 의 네이티브 크론은 백업으로 유지(scripts/deliver.ts
-- 시각 가드가 지연·수동 실행 off-slot 을 차단).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.dispatch_deliver()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pat text;
begin
  select decrypted_secret into pat
    from vault.decrypted_secrets where name = 'github_pat' limit 1;
  if pat is null or pat = '' then
    raise notice 'dispatch_deliver: vault 시크릿 github_pat 없음 — 스킵';
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/shakzmaos-jung/getkkul/actions/workflows/deliver.yml/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || pat,
      'Accept', 'application/vnd.github+json',
      'User-Agent', 'getkkul-pgcron',
      'X-GitHub-Api-Version', '2022-11-28'
    )
  );
end;
$$;

-- 정의자 권한 함수(Vault 접근·아웃바운드 HTTP) → 공개 실행 차단.
revoke execute on function public.dispatch_deliver() from public, anon, authenticated;

-- KST 07:30/11:30/17:30 = UTC 22:30/02:30/08:30. 같은 이름은 upsert 된다.
select cron.schedule('deliver-dispatch', '30 22,2,8 * * *', 'select public.dispatch_deliver();');
