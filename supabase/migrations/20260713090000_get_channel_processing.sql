-- 채널별 처리 현황 (SSR §5.3, AC-PI-1b). read-only · additive · service_role 전용.
-- 적용: 2026-07-12, getkkul(xgmiehptzafgiasmizaa). 구독된 채널만(subscriptions 참조).
-- 채널별 신규/요약/대기/처리중/실패. 모든 컬럼 동일 대상집합: (published_at >= content-cutoff
-- 2026-07-09 15:00Z) OR published_at IS NULL — 파이프라인 실제 처리 대상과 일치(spec-sync M3 보정).
create or replace function public.get_channel_processing()
returns jsonb language sql security definer set search_path = '' as $$
  with chans as (select distinct on (s.channel_id)
      s.channel_id, s.channel_title, s.channel_thumbnail, s.channel_handle
    from public.subscriptions s where s.channel_id is not null
    order by s.channel_id, s.created_at),
  agg as (select ch.channel_id, ch.channel_title, ch.channel_thumbnail, ch.channel_handle,
      count(v.id) filter (where (v.created_at at time zone 'Asia/Seoul')::date=(now() at time zone 'Asia/Seoul')::date and (v.published_at >= timestamptz '2026-07-09T15:00:00Z' or v.published_at is null)) as new,
      count(v.id) filter (where v.status='done' and (v.published_at >= timestamptz '2026-07-09T15:00:00Z' or v.published_at is null) and exists (select 1 from public.summaries sm where sm.video_id=v.id and sm.language='ko')) as summarized,
      count(v.id) filter (where v.status='pending' and (v.published_at >= timestamptz '2026-07-09T15:00:00Z' or v.published_at is null)) as pending,
      count(v.id) filter (where v.status='processing' and (v.published_at >= timestamptz '2026-07-09T15:00:00Z' or v.published_at is null)) as processing,
      count(v.id) filter (where v.status='failed' and (v.published_at >= timestamptz '2026-07-09T15:00:00Z' or v.published_at is null)) as failed
    from chans ch left join public.videos v on v.channel_id=ch.channel_id
    group by ch.channel_id, ch.channel_title, ch.channel_thumbnail, ch.channel_handle)
  select jsonb_build_object('cutoff', timestamptz '2026-07-09T15:00:00Z',
    'channels', coalesce(jsonb_agg(jsonb_build_object('channelId',channel_id,'channelTitle',channel_title,
      'channelThumbnail',channel_thumbnail,'channelHandle',channel_handle,
      'new',new,'summarized',summarized,'pending',pending,'processing',processing,'failed',failed)
      order by channel_title),'[]'::jsonb))
  from agg;
$$;
revoke all on function public.get_channel_processing() from public, anon, authenticated;
grant execute on function public.get_channel_processing() to service_role;
