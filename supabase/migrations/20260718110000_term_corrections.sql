-- 오타(용어) 교정 로그: 자막 전사가 망가뜨린 고유명사·전문용어를 요약 호출이 맥락에 맞게 교정한 기록.
-- 파이프라인(요약)이 적재하고, 어드민이 '오타 교정 로그' 메뉴에서 조회·수정·메모(추후 학습데이터)한다.
-- 조회/적재 전용 · service_role. 사용자 접근 없음(운영 로그).

create table if not exists public.term_corrections (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  original text not null,                       -- 전사/요약에 나타난 오인식 표기
  corrected text not null,                      -- 교정된 정규 표기(form 반영: 예 '키미 K3(Kimi K3)')
  form text not null check (form in ('ko','en','hybrid')),  -- 표기형: 한글/영어/하이브리드
  method text not null default 'llm' check (method in ('llm','admin')),  -- 자동(llm) vs 관리자 수정
  reason text,                                  -- 교정 근거/로직(LLM 설명)
  admin_memo text,                              -- 관리자 학습용 메모(이력 없음)
  edited_by uuid,                               -- 관리자 수정 시 세션 주체(신뢰: 서버 파생)
  updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (video_id, original)                   -- 영상당 같은 원표기는 1행(멱등)
);
create index if not exists term_corrections_created_idx on public.term_corrections (created_at desc);
create index if not exists term_corrections_video_idx on public.term_corrections (video_id);

alter table public.term_corrections enable row level security;
grant all on public.term_corrections to service_role;

-- 파이프라인 적재: 요약 호출이 방출한 교정 배열 upsert. 관리자가 손댄 행(method='admin')은 덮지 않는다.
-- p_items = [{original, corrected, form, reason}]. 같은 original 중복은 distinct 로 정리(단일 statement 재적중 방지).
create or replace function public.record_term_corrections(p_video_id uuid, p_items jsonb)
returns int language plpgsql security definer set search_path='' as $$
declare v_count int;
begin
  insert into public.term_corrections (video_id, original, corrected, form, method, reason)
  select p_video_id, d.o, d.c, d.f, 'llm', d.r
  from (
    select distinct on (btrim(it->>'original'))
      btrim(it->>'original') as o,
      btrim(it->>'corrected') as c,
      it->>'form' as f,
      nullif(btrim(it->>'reason'),'') as r
    from jsonb_array_elements(p_items) as it
    where nullif(btrim(it->>'original'),'') is not null
      and nullif(btrim(it->>'corrected'),'') is not null
      and (it->>'form') in ('ko','en','hybrid')
    order by btrim(it->>'original')
  ) d
  on conflict (video_id, original) do update
    set corrected = excluded.corrected, form = excluded.form, reason = excluded.reason
    where term_corrections.method <> 'admin';
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.record_term_corrections(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_term_corrections(uuid, jsonb) to service_role;

-- 어드민 교정 로그 조회(필터·검색·페이지네이션). read-only · service_role. 영상 제목·채널 조인.
create or replace function public.get_term_corrections(
  p_search text default null,      -- 원표기/교정/영상제목 ILIKE
  p_method text default null,      -- 'llm'|'admin'|null(전체)
  p_form text default null,        -- 'ko'|'en'|'hybrid'|null(전체)
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path='' as $$
  with filtered as (
    select tc.id, tc.created_at, tc.video_id, tc.original, tc.corrected, tc.form,
           tc.method, tc.reason, tc.admin_memo, tc.updated_at,
           v.title as video_title, coalesce(cc.title, v.channel_id) as channel_title
    from public.term_corrections tc
    join public.videos v on v.id = tc.video_id
    left join public.channel_catalog cc on cc.channel_id = v.channel_id
    where (p_method is null or tc.method = p_method)
      and (p_form is null or tc.form = p_form)
      and (p_search is null or p_search = ''
           or tc.original ilike '%'||p_search||'%'
           or tc.corrected ilike '%'||p_search||'%'
           or v.title ilike '%'||p_search||'%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'atKst', to_char(page.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
        'videoId', page.video_id,
        'videoTitle', page.video_title,
        'channelTitle', page.channel_title,
        'original', page.original,
        'corrected', page.corrected,
        'form', page.form,
        'method', page.method,
        'reason', page.reason,
        'adminMemo', page.admin_memo,
        'updatedAtKst', to_char(page.updated_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
      ) order by page.created_at desc)
      from (select * from filtered order by created_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_term_corrections(text, text, text, int, int) from public, anon, authenticated;
grant execute on function public.get_term_corrections(text, text, text, int, int) to service_role;

-- 어드민 교정 수정: 교정 결과·표기형·메모를 저장하고 method='admin' 로 승격(재적재 시 보존). 상태 문자열 반환.
create or replace function public.save_term_correction(
  p_id uuid, p_corrected text, p_form text, p_memo text, p_editor uuid
)
returns text language plpgsql security definer set search_path='' as $$
begin
  if nullif(btrim(p_corrected),'') is null then return 'missing_corrected'; end if;
  if p_form not in ('ko','en','hybrid') then return 'bad_form'; end if;
  update public.term_corrections
    set corrected = btrim(p_corrected),
        form = p_form,
        admin_memo = nullif(btrim(p_memo),''),
        method = 'admin',
        edited_by = p_editor,
        updated_at = now()
    where id = p_id;
  if not found then return 'missing'; end if;
  return 'ok';
end $$;
revoke all on function public.save_term_correction(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.save_term_correction(uuid, text, text, text, uuid) to service_role;

-- '콘텐츠 보기' 모달: 영상 id 로 요약 본문 + 메타 단건 조회(get_glossary_sources 조인 재사용, video_id 키).
create or replace function public.get_video_content(p_video_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select jsonb_build_object(
    'videoId', v.id,
    'title', v.title,
    'youtubeUrl', coalesce(v.url, 'https://www.youtube.com/watch?v=' || v.video_id),
    'ytId', v.video_id,
    'thumbnail', 'https://i.ytimg.com/vi/' || v.video_id || '/hqdefault.jpg',
    'durationSeconds', v.duration_seconds,
    'publishedAtKst', to_char(v.published_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
    'channelTitle', coalesce(cc.title, v.channel_id),
    'channelHandle', cc.handle,
    'headline', sm.headline,
    'coreText', sm.core_text,
    'summaryCreatedAtKst', to_char(sm.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
  )
  from public.videos v
  left join public.channel_catalog cc on cc.channel_id = v.channel_id
  left join lateral (
    select headline, core_text, created_at from public.summaries s
    where s.video_id = v.id and s.language = 'ko'
    order by case s.length_mode when 'long' then 0 when 'normal' then 1 else 2 end
    limit 1
  ) sm on true
  where v.id = p_video_id;
$$;
revoke all on function public.get_video_content(uuid) from public, anon, authenticated;
grant execute on function public.get_video_content(uuid) to service_role;

notify pgrst, 'reload schema';
