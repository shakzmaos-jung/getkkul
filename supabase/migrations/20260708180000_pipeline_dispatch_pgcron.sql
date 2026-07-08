-- 신뢰성 트리거 (pipeline-reliability REQ-D2): Supabase pg_cron 이 GitHub pipeline 워크플로를
-- 20분마다 dispatch 한다(정각 회피 :07/:27/:47, AC-D2.1). GitHub 자체 크론 지연/드롭에 덜 의존.
-- PAT 은 Vault 시크릿 'github_pat' 에서 읽는다(코드/마이그레이션에 값 미포함, I3). 시크릿이 없으면
-- 함수는 no-op → 사용자가 PAT 등록 시 자동 활성화. 기존 GitHub 크론은 백업으로 유지(무중단).

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.dispatch_pipeline()
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
    raise notice 'dispatch_pipeline: vault 시크릿 github_pat 없음 — 스킵';
    return;
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/shakzmaos-jung/getkkul/actions/workflows/pipeline.yml/dispatches',
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
revoke execute on function public.dispatch_pipeline() from public, anon, authenticated;

-- 20분 주기(정각 회피). 같은 이름은 upsert 된다.
select cron.schedule('pipeline-dispatch', '7,27,47 * * * *', 'select public.dispatch_pipeline();');
