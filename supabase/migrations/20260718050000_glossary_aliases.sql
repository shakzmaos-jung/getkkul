-- 용어사전 alias(다른 표기) — 고유 id 하나에 대표명 외 복수 표기를 등록해 표기 변형(키미3·Kimi 3·키미쓰리…)도
-- 같은 용어 툴팁으로 매칭. + CSV 일괄 업데이트 RPC(import_glossary_csv). 컬럼 추가는 가산·안전, 함수 일부 drop/recreate.

-- 1) aliases 컬럼(가산)
alter table public.glossary_terms add column if not exists aliases text[] not null default '{}';

-- 헬퍼: alias 정규화(trim·빈값제거·중복제거·정렬 → 비교 순서무관)
create or replace function public.glossary_clean_aliases(p text[])
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct t order by t), '{}'::text[])
  from (select btrim(x) t from unnest(coalesce(p, '{}'::text[])) x) s
  where t <> '';
$$;

-- 2) 읽기 RPC: alias 매칭 추가(반환행 변경 → drop 후 recreate)
drop function if exists public.get_video_glossary(uuid[]);
create function public.get_video_glossary(p_video_ids uuid[])
returns table (video_id uuid, id uuid, term_ko text, term_en text, definition text, aliases text[])
language sql security invoker set search_path = '' as $$
  select distinct s.video_id, gt.id, gt.term_ko, gt.term_en, gt.definition, gt.aliases
  from public.summaries s
  join public.glossary_terms gt
    on gt.disabled = false
   and gt.definition is not null
   and (
     (gt.term_ko is not null and s.core_text ilike '%' || gt.term_ko || '%')
     or (gt.term_en is not null and s.core_text ilike '%' || gt.term_en || '%')
     or exists (select 1 from unnest(gt.aliases) a where a <> '' and s.core_text ilike '%' || a || '%')
   )
  where s.video_id = any (p_video_ids)
    and s.language = 'ko';
$$;
revoke all on function public.get_video_glossary(uuid[]) from public, anon;
grant execute on function public.get_video_glossary(uuid[]) to authenticated;

-- 3) 파이프라인 정의 등록: 중복 스킵에 alias 포함(alias 표기 재생성=부활 방지). 동일 시그니처 → replace.
create or replace function public.define_glossary_terms(p_defs jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare d jsonb; n int := 0; v_ko text; v_en text; v_id uuid;
begin
  for d in select * from jsonb_array_elements(p_defs) loop
    v_ko := nullif(btrim(d->>'term_ko'), '');
    v_en := nullif(btrim(d->>'term_en'), '');
    if v_ko is null and v_en is null then continue; end if;
    if exists (
      select 1 from public.glossary_terms g
      where (v_ko is not null and (g.term_ko = v_ko or v_ko = any(g.aliases)))
         or (v_en is not null and (g.term_en = v_en or v_en = any(g.aliases)))
    ) then continue; end if;
    insert into public.glossary_terms (term_ko, term_en, definition, source, defined_at)
      values (v_ko, v_en, nullif(btrim(d->>'definition'), ''), 'llm', now())
      returning id into v_id;
    insert into public.glossary_term_history (term_id, action, after)
      values (v_id, 'create', jsonb_build_object(
        'term_ko', v_ko, 'term_en', v_en, 'definition', nullif(btrim(d->>'definition'), ''),
        'source', 'llm', 'disabled', false));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.define_glossary_terms(jsonb) from public, anon, authenticated;
grant execute on function public.define_glossary_terms(jsonb) to service_role;

-- 4) 어드민 조회 RPC: rows 에 aliases 추가. 동일 시그니처 → replace.
create or replace function public.get_glossary(
  p_source text default null,
  p_status text default null,
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path = '' as $$
  with filtered as (
    select gt.id, gt.term_ko, gt.term_en, gt.definition, gt.note, gt.aliases, gt.source, gt.disabled,
      gt.updated_at, p.email as editor_email,
      (select count(*) from public.glossary_term_history h where h.term_id = gt.id) as edit_count,
      (select count(*) from public.glossary_terms g2
        where g2.id <> gt.id
          and (
            (gt.term_ko is not null and g2.term_ko = gt.term_ko)
            or (gt.term_ko is null and gt.term_en is not null and g2.term_en = gt.term_en)
          )
      ) as homonym_count
    from public.glossary_terms gt
    left join public.profiles p on p.id = gt.updated_by
    where (p_source is null or gt.source = p_source)
      and (p_status is null
           or (p_status = 'active' and gt.disabled = false)
           or (p_status = 'disabled' and gt.disabled = true))
      and (p_search is null or p_search = ''
           or gt.term_ko ilike '%' || p_search || '%'
           or gt.term_en ilike '%' || p_search || '%'
           or coalesce(gt.definition, '') ilike '%' || p_search || '%'
           or exists (select 1 from unnest(gt.aliases) a where a ilike '%' || p_search || '%'))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'termKo', page.term_ko,
        'termEn', page.term_en,
        'definition', page.definition,
        'note', page.note,
        'aliases', page.aliases,
        'source', page.source,
        'disabled', page.disabled,
        'editorEmail', page.editor_email,
        'editCount', page.edit_count,
        'homonymCount', page.homonym_count,
        'updatedAtKst', to_char(page.updated_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
      ) order by page.updated_at desc)
      from (select * from filtered order by updated_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_glossary(text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.get_glossary(text, text, text, int, int) to service_role;

-- 5) 신규 등록 RPC: p_aliases 추가(default 로 구버전 호출 호환). drop + create.
drop function if exists public.add_glossary_term(text, text, text, text, uuid);
create function public.add_glossary_term(
  p_term_ko text, p_term_en text, p_definition text, p_note text, p_editor uuid, p_aliases text[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_ko text; v_en text; v_id uuid; v_aliases text[];
begin
  v_ko := nullif(btrim(p_term_ko), '');
  v_en := nullif(btrim(p_term_en), '');
  if v_ko is null and v_en is null then return null; end if;
  v_aliases := public.glossary_clean_aliases(p_aliases);
  insert into public.glossary_terms (term_ko, term_en, definition, note, aliases, source, updated_by, defined_at)
    values (v_ko, v_en, nullif(btrim(p_definition), ''), nullif(btrim(p_note), ''), v_aliases, 'admin', p_editor, now())
    returning id into v_id;
  insert into public.glossary_term_history (term_id, action, after, editor)
    values (v_id, 'create', jsonb_build_object(
      'term_ko', v_ko, 'term_en', v_en, 'definition', nullif(btrim(p_definition), ''),
      'aliases', v_aliases, 'source', 'admin', 'disabled', false), p_editor);
  return v_id;
end $$;
revoke all on function public.add_glossary_term(text, text, text, text, uuid, text[]) from public, anon, authenticated;
grant execute on function public.add_glossary_term(text, text, text, text, uuid, text[]) to service_role;

-- 6) 수정 RPC: p_aliases 추가(default null = 기존 유지 → 구버전 호출이 alias 를 지우지 않음). drop + create.
drop function if exists public.save_glossary_term(uuid, text, text, text, text, uuid);
create function public.save_glossary_term(
  p_id uuid, p_term_ko text, p_term_en text, p_definition text, p_note text, p_editor uuid, p_aliases text[] default null
) returns text language plpgsql security definer set search_path = '' as $$
declare old_row public.glossary_terms; v_ko text; v_en text; v_def text; v_note text; v_aliases text[]; tracked_changed boolean;
begin
  select * into old_row from public.glossary_terms where id = p_id;
  if not found then return 'missing'; end if;
  v_ko := nullif(btrim(p_term_ko), '');
  v_en := nullif(btrim(p_term_en), '');
  v_def := nullif(btrim(p_definition), '');
  v_note := nullif(btrim(p_note), '');
  v_aliases := case when p_aliases is null then old_row.aliases else public.glossary_clean_aliases(p_aliases) end;
  if v_ko is null and v_en is null then return 'missing_name'; end if;

  tracked_changed := (v_ko is distinct from old_row.term_ko)
                  or (v_en is distinct from old_row.term_en)
                  or (v_def is distinct from old_row.definition)
                  or (v_aliases is distinct from old_row.aliases);

  if old_row.term_ko is not null and v_ko is distinct from old_row.term_ko and v_ko is not null then
    update public.content_terms set terms = array_replace(terms, old_row.term_ko, v_ko) where old_row.term_ko = any (terms);
  end if;

  if tracked_changed then
    insert into public.glossary_term_history (term_id, action, before, after, editor)
      values (p_id, 'edit',
        jsonb_build_object('term_ko', old_row.term_ko, 'term_en', old_row.term_en, 'definition', old_row.definition,
          'aliases', old_row.aliases, 'source', old_row.source, 'disabled', old_row.disabled),
        jsonb_build_object('term_ko', v_ko, 'term_en', v_en, 'definition', v_def,
          'aliases', v_aliases, 'source', 'admin', 'disabled', old_row.disabled),
        p_editor);
  end if;

  update public.glossary_terms
    set term_ko = v_ko, term_en = v_en, definition = v_def, note = v_note, aliases = v_aliases,
        source = case when tracked_changed then 'admin' else source end,
        updated_by = case when tracked_changed then p_editor else updated_by end,
        updated_at = now()
    where id = p_id;
  return 'ok';
end $$;
revoke all on function public.save_glossary_term(uuid, text, text, text, text, uuid, text[]) from public, anon, authenticated;
grant execute on function public.save_glossary_term(uuid, text, text, text, text, uuid, text[]) to service_role;

-- 7) CSV 일괄 업데이트 RPC: id 기준 update 전용. 편집필드(대표명/alias/정의/메모)만, 변경분만 updated_at.
create or replace function public.import_glossary_csv(p_rows jsonb, p_editor uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r jsonb; old_row public.glossary_terms; v_id uuid;
  v_ko text; v_en text; v_def text; v_note text; v_aliases text[]; tracked_changed boolean;
  n_updated int := 0; n_unchanged int := 0; n_missing int := 0; n_skipped int := 0;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    begin v_id := nullif(btrim(r->>'id'), '')::uuid; exception when others then v_id := null; end;
    if v_id is null then n_skipped := n_skipped + 1; continue; end if;
    select * into old_row from public.glossary_terms where id = v_id;
    if not found then n_missing := n_missing + 1; continue; end if;

    v_ko := nullif(btrim(r->>'term_ko'), '');
    v_en := nullif(btrim(r->>'term_en'), '');
    v_def := nullif(btrim(r->>'definition'), '');
    v_note := nullif(btrim(r->>'note'), '');
    v_aliases := public.glossary_clean_aliases(
      case when jsonb_typeof(r->'aliases') = 'array'
        then array(select jsonb_array_elements_text(r->'aliases')) else '{}'::text[] end);
    if v_ko is null and v_en is null then n_skipped := n_skipped + 1; continue; end if;

    tracked_changed := (v_ko is distinct from old_row.term_ko)
                    or (v_en is distinct from old_row.term_en)
                    or (v_def is distinct from old_row.definition)
                    or (v_aliases is distinct from old_row.aliases);
    if tracked_changed or (v_note is distinct from old_row.note) then
      if old_row.term_ko is not null and v_ko is distinct from old_row.term_ko and v_ko is not null then
        update public.content_terms set terms = array_replace(terms, old_row.term_ko, v_ko) where old_row.term_ko = any (terms);
      end if;
      if tracked_changed then
        insert into public.glossary_term_history (term_id, action, before, after, editor)
          values (v_id, 'edit',
            jsonb_build_object('term_ko', old_row.term_ko, 'term_en', old_row.term_en, 'definition', old_row.definition,
              'aliases', old_row.aliases, 'source', old_row.source, 'disabled', old_row.disabled),
            jsonb_build_object('term_ko', v_ko, 'term_en', v_en, 'definition', v_def,
              'aliases', v_aliases, 'source', 'admin', 'disabled', old_row.disabled),
            p_editor);
      end if;
      update public.glossary_terms
        set term_ko = v_ko, term_en = v_en, definition = v_def, note = v_note, aliases = v_aliases,
            source = case when tracked_changed then 'admin' else source end,
            updated_by = case when tracked_changed then p_editor else updated_by end,
            updated_at = now()
        where id = v_id;
      n_updated := n_updated + 1;
    else
      n_unchanged := n_unchanged + 1;
    end if;
  end loop;
  return jsonb_build_object('updated', n_updated, 'unchanged', n_unchanged, 'missing', n_missing, 'skipped', n_skipped);
end $$;
revoke all on function public.import_glossary_csv(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.import_glossary_csv(jsonb, uuid) to service_role;

-- 함수 drop/recreate → PostgREST 스키마 캐시 리로드
notify pgrst, 'reload schema';
