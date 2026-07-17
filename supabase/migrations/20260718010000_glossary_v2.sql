-- 용어사전 v2: 고유 id PK 재키 + 한글/영어 분리(term_ko/term_en) + 동음이의(다중 행) + 일시정지(disabled)
--            + 관리자 메모(note, 이력 없음) + 이력 재구성(action/before/after) + CRUD RPC.
-- 기존 term(PK) 데이터를 in-place ALTER 로 이관(테이블 OID·RLS·grant 보존). content_terms 무변경.
-- ⚠️ 파괴적 스키마 변경(에스컬레이션 승인됨). 트랜잭션(마이그레이션)으로 원자 적용.

-- ============================================================
-- 1) glossary_terms: term(PK) → id(PK) + term_ko/term_en/note/disabled
-- ============================================================
alter table public.glossary_terms
  add column id uuid not null default gen_random_uuid(),
  add column term_ko text,
  add column term_en text,
  add column note text,
  add column disabled boolean not null default false;

-- 이관: 한글 포함이면 term_ko, 아니면(영문/기호) term_en.
update public.glossary_terms
  set term_ko = case when term ~ '[가-힣]' then term else null end,
      term_en = case when term ~ '[가-힣]' then null else term end;

alter table public.glossary_terms drop constraint glossary_terms_pkey;
alter table public.glossary_terms add constraint glossary_terms_pkey primary key (id);
alter table public.glossary_terms
  add constraint glossary_terms_name_present check (term_ko is not null or term_en is not null);
alter table public.glossary_terms drop column term;

create index glossary_terms_ko_idx on public.glossary_terms (term_ko);
create index glossary_terms_en_idx on public.glossary_terms (term_en);

-- ============================================================
-- 2) glossary_term_history: term(text) → term_id(uuid FK) + action/before/after
-- ============================================================
drop index if exists public.glossary_history_term_idx;

alter table public.glossary_term_history
  add column term_id uuid,
  add column action text,
  add column before jsonb,
  add column after jsonb;

-- 기존 이력 이관: term 문자열로 새 행 매칭. old_definition 유무로 create/edit 분류.
update public.glossary_term_history h
  set term_id = gt.id,
      action = case when h.old_definition is null and h.old_source is null then 'create' else 'edit' end,
      before = case when h.old_definition is null and h.old_source is null then null
                    else jsonb_build_object('definition', h.old_definition, 'source', h.old_source) end,
      after = jsonb_build_object('definition', h.new_definition, 'source', h.new_source)
  from public.glossary_terms gt
  where gt.term_ko = h.term or gt.term_en = h.term;

update public.glossary_term_history set action = 'create' where action is null;
alter table public.glossary_term_history alter column action set not null;

alter table public.glossary_term_history
  add constraint glossary_term_history_term_id_fkey
  foreign key (term_id) references public.glossary_terms (id) on delete set null;

alter table public.glossary_term_history
  drop column term,
  drop column old_definition,
  drop column new_definition,
  drop column old_source,
  drop column new_source;

create index glossary_history_term_idx on public.glossary_term_history (term_id, edited_at desc);

-- ============================================================
-- 3) 이전 시그니처 함수 제거(인자/반환 변경분)
-- ============================================================
drop function if exists public.get_glossary(text, text, timestamptz, timestamptz, int, int);
drop function if exists public.get_glossary_history(text);
drop function if exists public.edit_glossary_term(text, text, uuid);
-- get_video_glossary 는 반환(OUT) 행 타입이 바뀌므로 create or replace 불가 → 먼저 drop.
drop function if exists public.get_video_glossary(uuid[]);

-- ============================================================
-- 4) 읽기 RPC(하이브리드) v2: disabled=false + term_ko OR term_en 본문 매칭. id 포함 반환.
-- ============================================================
create or replace function public.get_video_glossary(p_video_ids uuid[])
returns table (video_id uuid, id uuid, term_ko text, term_en text, definition text)
language sql security invoker set search_path = '' as $$
  select distinct s.video_id, gt.id, gt.term_ko, gt.term_en, gt.definition
  from public.summaries s
  join public.glossary_terms gt
    on gt.disabled = false
   and gt.definition is not null
   and (
     (gt.term_ko is not null and s.core_text ilike '%' || gt.term_ko || '%')
     or (gt.term_en is not null and s.core_text ilike '%' || gt.term_en || '%')
   )
  where s.video_id = any (p_video_ids)
    and s.language = 'ko';
$$;
revoke all on function public.get_video_glossary(uuid[]) from public, anon;
grant execute on function public.get_video_glossary(uuid[]) to authenticated;

-- ============================================================
-- 5) 정의 배치 등록(파이프라인) v2: (term_ko, term_en, definition). 같은 표기(어느 컬럼이든) 있으면 스킵. 신규분만 이력.
-- ============================================================
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
      where (v_ko is not null and g.term_ko = v_ko)
         or (v_en is not null and g.term_en = v_en)
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

-- ============================================================
-- 6) 어드민 조회 RPC v2: 필터(source/status/검색) + homonymCount 파생 + note.
-- ============================================================
create or replace function public.get_glossary(
  p_source text default null,
  p_status text default null,   -- null | 'active' | 'disabled'
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path = '' as $$
  with filtered as (
    select gt.id, gt.term_ko, gt.term_en, gt.definition, gt.note, gt.source, gt.disabled,
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
           or coalesce(gt.definition, '') ilike '%' || p_search || '%')
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

-- ============================================================
-- 7) 이력 RPC v2: term_id 기준. action/before/after.
-- ============================================================
create or replace function public.get_glossary_history(p_term_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'action', h.action,
    'before', h.before,
    'after', h.after,
    'editorEmail', p.email,
    'editedAtKst', to_char(h.edited_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS')
  ) order by h.edited_at desc), '[]'::jsonb)
  from public.glossary_term_history h
  left join public.profiles p on p.id = h.editor
  where h.term_id = p_term_id;
$$;
revoke all on function public.get_glossary_history(uuid) from public, anon, authenticated;
grant execute on function public.get_glossary_history(uuid) to service_role;

-- ============================================================
-- 8) 어드민 신규 등록 RPC: 관리자. 이력 create.
-- ============================================================
create or replace function public.add_glossary_term(
  p_term_ko text, p_term_en text, p_definition text, p_note text, p_editor uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_ko text; v_en text; v_id uuid;
begin
  v_ko := nullif(btrim(p_term_ko), '');
  v_en := nullif(btrim(p_term_en), '');
  if v_ko is null and v_en is null then return null; end if;
  insert into public.glossary_terms (term_ko, term_en, definition, note, source, updated_by, defined_at)
    values (v_ko, v_en, nullif(btrim(p_definition), ''), nullif(btrim(p_note), ''), 'admin', p_editor, now())
    returning id into v_id;
  insert into public.glossary_term_history (term_id, action, after, editor)
    values (v_id, 'create', jsonb_build_object(
      'term_ko', v_ko, 'term_en', v_en, 'definition', nullif(btrim(p_definition), ''),
      'source', 'admin', 'disabled', false), p_editor);
  return v_id;
end $$;
revoke all on function public.add_glossary_term(text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.add_glossary_term(text, text, text, text, uuid) to service_role;

-- ============================================================
-- 9) 어드민 수정 RPC: id 기준. note 는 항상 갱신·이력 제외. 추적필드 변경 시에만 edit 이력.
--    term_ko 변경 시 content_terms 동기화(부활 방지).
-- ============================================================
create or replace function public.save_glossary_term(
  p_id uuid, p_term_ko text, p_term_en text, p_definition text, p_note text, p_editor uuid
) returns text language plpgsql security definer set search_path = '' as $$
declare old_row public.glossary_terms; v_ko text; v_en text; v_def text; v_note text; tracked_changed boolean;
begin
  select * into old_row from public.glossary_terms where id = p_id;
  if not found then return 'missing'; end if;
  v_ko := nullif(btrim(p_term_ko), '');
  v_en := nullif(btrim(p_term_en), '');
  v_def := nullif(btrim(p_definition), '');
  v_note := nullif(btrim(p_note), '');
  if v_ko is null and v_en is null then return 'missing_name'; end if;

  tracked_changed := (v_ko is distinct from old_row.term_ko)
                  or (v_en is distinct from old_row.term_en)
                  or (v_def is distinct from old_row.definition);

  -- 이름(term_ko) 변경 시 content_terms 표기 동기화(파이프라인 재생성 방지)
  if old_row.term_ko is not null and v_ko is distinct from old_row.term_ko and v_ko is not null then
    update public.content_terms
      set terms = array_replace(terms, old_row.term_ko, v_ko)
      where old_row.term_ko = any (terms);
  end if;

  if tracked_changed then
    insert into public.glossary_term_history (term_id, action, before, after, editor)
      values (p_id, 'edit',
        jsonb_build_object('term_ko', old_row.term_ko, 'term_en', old_row.term_en,
          'definition', old_row.definition, 'source', old_row.source, 'disabled', old_row.disabled),
        jsonb_build_object('term_ko', v_ko, 'term_en', v_en,
          'definition', v_def, 'source', 'admin', 'disabled', old_row.disabled),
        p_editor);
  end if;

  update public.glossary_terms
    set term_ko = v_ko, term_en = v_en, definition = v_def, note = v_note,
        source = case when tracked_changed then 'admin' else source end,
        updated_by = case when tracked_changed then p_editor else updated_by end,
        updated_at = now()
    where id = p_id;
  return 'ok';
end $$;
revoke all on function public.save_glossary_term(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.save_glossary_term(uuid, text, text, text, text, uuid) to service_role;

-- ============================================================
-- 10) 어드민 일시정지/해제 RPC. 이력 disable/enable.
-- ============================================================
create or replace function public.set_glossary_disabled(p_id uuid, p_disabled boolean, p_editor uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare old_row public.glossary_terms;
begin
  select * into old_row from public.glossary_terms where id = p_id;
  if not found then return 'missing'; end if;
  if old_row.disabled = p_disabled then return 'ok'; end if;
  update public.glossary_terms
    set disabled = p_disabled, updated_at = now(), updated_by = p_editor where id = p_id;
  insert into public.glossary_term_history (term_id, action, before, after, editor)
    values (p_id, case when p_disabled then 'disable' else 'enable' end,
      jsonb_build_object('disabled', old_row.disabled), jsonb_build_object('disabled', p_disabled), p_editor);
  return 'ok';
end $$;
revoke all on function public.set_glossary_disabled(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.set_glossary_disabled(uuid, boolean, uuid) to service_role;

-- ============================================================
-- 11) 어드민 삭제 RPC. 이력 delete(before 스냅샷; term_id 는 on delete set null 로 이후 null).
-- ============================================================
create or replace function public.delete_glossary_term(p_id uuid, p_editor uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare old_row public.glossary_terms;
begin
  select * into old_row from public.glossary_terms where id = p_id;
  if not found then return 'missing'; end if;
  insert into public.glossary_term_history (term_id, action, before, editor)
    values (p_id, 'delete',
      jsonb_build_object('term_ko', old_row.term_ko, 'term_en', old_row.term_en,
        'definition', old_row.definition, 'source', old_row.source, 'disabled', old_row.disabled),
      p_editor);
  delete from public.glossary_terms where id = p_id;
  return 'ok';
end $$;
revoke all on function public.delete_glossary_term(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_glossary_term(uuid, uuid) to service_role;
