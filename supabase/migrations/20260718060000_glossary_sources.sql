-- 어드민 용어사전 '콘텐츠' 열: 용어가 도출된 소스 영상(content_terms 추출 캐시 매칭)의 요약 본문 + 메타 조회.
-- 조회 전용 신규 함수(테이블 변경 없음).
create or replace function public.get_glossary_sources(p_term_id uuid, p_limit int default 50)
returns jsonb language sql security definer set search_path = '' as $$
  with t as (
    select term_ko, term_en, aliases from public.glossary_terms where id = p_term_id
  ),
  surfaces as (
    select distinct btrim(x) as x
    from t, lateral (
      select t.term_ko union all select t.term_en union all select unnest(t.aliases)
    ) u(x)
    where nullif(btrim(x), '') is not null
  ),
  src as (
    select ct.video_id
    from public.content_terms ct
    where exists (select 1 from surfaces s where s.x = any (ct.terms))
  ),
  page as (
    select v.id, v.video_id, v.title, v.url, v.published_at, v.duration_seconds, v.channel_id
    from public.videos v
    where v.id in (select video_id from src)
    order by v.published_at desc nulls last
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'videoId', p.id,
    'title', p.title,
    'youtubeUrl', coalesce(p.url, 'https://www.youtube.com/watch?v=' || p.video_id),
    'ytId', p.video_id,
    'thumbnail', 'https://i.ytimg.com/vi/' || p.video_id || '/hqdefault.jpg',
    'durationSeconds', p.duration_seconds,
    'publishedAtKst', to_char(p.published_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
    'channelTitle', coalesce(cc.title, p.channel_id),
    'channelHandle', cc.handle,
    'headline', sm.headline,
    'coreText', sm.core_text,
    'summaryCreatedAtKst', to_char(sm.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI')
  ) order by p.published_at desc nulls last), '[]'::jsonb)
  from page p
  left join public.channel_catalog cc on cc.channel_id = p.channel_id
  left join lateral (
    select headline, core_text, created_at from public.summaries s
    where s.video_id = p.id and s.language = 'ko'
    order by case s.length_mode when 'long' then 0 when 'normal' then 1 else 2 end
    limit 1
  ) sm on true;
$$;
revoke all on function public.get_glossary_sources(uuid, int) from public, anon, authenticated;
grant execute on function public.get_glossary_sources(uuid, int) to service_role;

notify pgrst, 'reload schema';
