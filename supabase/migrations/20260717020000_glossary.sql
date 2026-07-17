-- 전역 용어 사전 + 수정 감사 + 설정 토글 + 조회/수정 RPC.
-- 용어당 정의 1회 생성 후 재사용(LLM 재호출 방지), 관리자 수정 가능(source·이력 추적), 카드 하이브리드 표시.

-- 1) 전역 용어 사전 (용어당 1행, 정의 재사용)
create table if not exists public.glossary_terms (
  term text primary key,
  definition text,
  source text not null default 'llm',                                   -- 'llm' | 'admin'
  updated_by uuid references public.profiles (id) on delete set null,   -- 관리자, llm 이면 null
  defined_at timestamptz,                                               -- 정의 최초 설정 시각
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.glossary_terms enable row level security;
create policy "glossary_terms - authed read" on public.glossary_terms
  for select to authenticated using (true);
grant all on public.glossary_terms to service_role;

-- 2) 수정 감사(등록/수정 이력)
create table if not exists public.glossary_term_history (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  old_definition text,
  new_definition text,
  old_source text,
  new_source text not null,
  editor uuid references public.profiles (id) on delete set null,       -- null = LLM 최초 생성
  edited_at timestamptz not null default now()
);
create index if not exists glossary_history_term_idx on public.glossary_term_history (term, edited_at desc);
alter table public.glossary_term_history enable row level security;
grant all on public.glossary_term_history to service_role;

-- 3) 설정 토글(컬럼 grant 필수 — user_settings 컬럼레벨 grant 패턴)
alter table public.user_settings
  add column if not exists term_tooltips boolean not null default true;
grant update (term_tooltips) on public.user_settings to authenticated;

-- 4) 읽기 RPC(하이브리드): 로드된 영상들의 ko 요약 본문에 등장하는 "정의 있는" 용어를 영상별 반환.
--    (a) 이 영상에서 추출된 용어 + (b) 추출 안 됐어도 전역 사전에 있고 본문에 나오는 용어 = 합집합.
create or replace function public.get_video_glossary(p_video_ids uuid[])
returns table (video_id uuid, term text, definition text)
language sql security invoker set search_path = '' as $$
  select distinct s.video_id, gt.term, gt.definition
  from public.summaries s
  join public.glossary_terms gt
    on gt.definition is not null
   and s.core_text ilike '%' || gt.term || '%'
  where s.video_id = any (p_video_ids)
    and s.language = 'ko';
$$;
revoke all on function public.get_video_glossary(uuid[]) from public, anon;
grant execute on function public.get_video_glossary(uuid[]) to authenticated;

-- 5) 정의 배치 등록(파이프라인): 정의 없는 신규 용어만. 이미 있으면 스킵(재호출 방지). 신규분만 이력 기록. service_role.
create or replace function public.define_glossary_terms(p_defs jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare d jsonb; n int := 0;
begin
  for d in select * from jsonb_array_elements(p_defs) loop
    insert into public.glossary_terms (term, definition, source, defined_at)
      values (d->>'term', d->>'definition', 'llm', now())
    on conflict (term) do nothing;
    if found then
      insert into public.glossary_term_history (term, new_definition, new_source)
        values (d->>'term', d->>'definition', 'llm');
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.define_glossary_terms(jsonb) from public, anon, authenticated;
grant execute on function public.define_glossary_terms(jsonb) to service_role;

-- 6) 어드민 조회 RPC: 용어 사전(필터·검색·페이지네이션). 이메일 원문 반환→fetch 마스킹. service_role.
create or replace function public.get_glossary(
  p_source text default null,
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path='' as $$
  with filtered as (
    select gt.term, gt.definition, gt.source, gt.updated_at, p.email as editor_email,
      (select count(*) from public.glossary_term_history h where h.term = gt.term) as edit_count
    from public.glossary_terms gt
    left join public.profiles p on p.id = gt.updated_by
    where (p_source is null or gt.source = p_source)
      and (p_from is null or gt.updated_at >= p_from)
      and (p_to   is null or gt.updated_at <  p_to)
      and (p_search is null or p_search = '' or gt.term ilike '%'||p_search||'%' or coalesce(gt.definition,'') ilike '%'||p_search||'%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'term', page.term,
        'definition', page.definition,
        'source', page.source,
        'editorEmail', page.editor_email,
        'editCount', page.edit_count,
        'updatedAtKst', to_char(page.updated_at at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI')
      ) order by page.updated_at desc)
      from (select * from filtered order by updated_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_glossary(text,text,timestamptz,timestamptz,int,int) from public, anon, authenticated;
grant execute on function public.get_glossary(text,text,timestamptz,timestamptz,int,int) to service_role;

-- 7) 어드민 이력 RPC: 특정 용어 변경 이력(등록/수정자·일시). service_role.
create or replace function public.get_glossary_history(p_term text)
returns jsonb language sql security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'oldDefinition', h.old_definition,
    'newDefinition', h.new_definition,
    'oldSource', h.old_source,
    'newSource', h.new_source,
    'editorEmail', p.email,
    'editedAtKst', to_char(h.edited_at at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI:SS')
  ) order by h.edited_at desc), '[]'::jsonb)
  from public.glossary_term_history h
  left join public.profiles p on p.id = h.editor
  where h.term = p_term;
$$;
revoke all on function public.get_glossary_history(text) from public, anon, authenticated;
grant execute on function public.get_glossary_history(text) to service_role;

-- 8) 어드민 수정 RPC(원자적): 정의 갱신 + 이력 기록 + source='admin'. service_role.
create or replace function public.edit_glossary_term(p_term text, p_definition text, p_editor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare old_def text; old_src text;
begin
  select definition, source into old_def, old_src from public.glossary_terms where term = p_term;
  if not found then return; end if;  -- 존재하는 용어만 수정
  insert into public.glossary_term_history (term, old_definition, new_definition, old_source, new_source, editor)
    values (p_term, old_def, p_definition, old_src, 'admin', p_editor);
  update public.glossary_terms
    set definition = p_definition, source = 'admin', updated_by = p_editor,
        updated_at = now(), defined_at = coalesce(defined_at, now())
    where term = p_term;
end $$;
revoke all on function public.edit_glossary_term(text,text,uuid) from public, anon, authenticated;
grant execute on function public.edit_glossary_term(text,text,uuid) to service_role;
