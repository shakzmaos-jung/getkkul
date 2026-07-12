-- 파이프라인 자동 점검(gk_pipeline_check, ADR-0016) 정시 디스패치.
-- Supabase pg_cron 이 GitHub pipeline-check 워크플로를 KST 08/10/12/14/16/18/20/22시
-- (= UTC 23/01/03/05/07/09/11/13)에 dispatch 한다. GitHub 네이티브 schedule 은 백업.
-- PAT 은 Vault 시크릿 'github_pat'(dispatch_pipeline/dispatch_deliver 과 동일)에서 읽는다.
-- 시크릿이 없으면 no-op.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.dispatch_pipeline_check()
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
    raise notice 'dispatch_pipeline_check: vault 시크릿 github_pat 없음 — 스킵';
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/shakzmaos-jung/getkkul/actions/workflows/pipeline-check.yml/dispatches',
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
revoke execute on function public.dispatch_pipeline_check() from public, anon, authenticated;

-- KST 08/10/12/14/16/18/20/22 = UTC 23,1,3,5,7,9,11,13. 같은 이름은 upsert 된다.
select cron.schedule('pipeline-check-dispatch', '0 23,1,3,5,7,9,11,13 * * *', 'select public.dispatch_pipeline_check();');
