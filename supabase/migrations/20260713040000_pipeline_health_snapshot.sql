-- 파이프라인 자동 점검(gk_pipeline_check, ADR-0016)의 데이터 수집 함수.
-- 탐지·전사·요약·발송 4단계 건강 지표를 한 번의 rpc 로 모아 jsonb 로 돌려준다.
-- 판정(✅/⚠️)·리포트 렌더는 앱단(lib/pipeline/health-check.ts)에서 한다.
--
-- 오탐 방지 원칙: 모든 backlog 신호는 콘텐츠 컷오프(2026-07-10 = UTC 2026-07-09T15:00Z)
-- 이후만 센다. 신규 구독 채널의 과거 영상(dead data)은 알람 대상이 아니며 참고치로만 노출.
--
-- SECURITY DEFINER: pipeline_runs/videos/deliveries(서비스롤 전용·RLS)를 정의자 권한으로 집계.
-- 따라서 anon/authenticated 실행은 차단하고 service_role 에게만 허용한다.

create or replace function public.pipeline_health_snapshot()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with cutoff as (select timestamptz '2026-07-09T15:00:00Z' as ts),
  today_kst as (select (now() at time zone 'Asia/Seoul')::date as d),
  last_pipeline as (
    select round((extract(epoch from (now() - max(started_at))) / 60)::numeric, 1) as age_min
    from public.pipeline_runs where kind = 'pipeline'
  ),
  failed_runs as (
    select coalesce(jsonb_agg(jsonb_build_object(
        'kind', kind,
        'error', left(coalesce(stats->>'error', '(error 필드 없음)'), 200),
        'atKst', to_char(started_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI')
      ) order by started_at desc), '[]'::jsonb) as arr
    from public.pipeline_runs
    where ok = false and created_at > now() - interval '24 hours'
  ),
  latest_detect as (
    select coalesce((stats->>'detectFailures')::int, 0) as detect_failures
    from public.pipeline_runs where kind = 'detect' order by started_at desc limit 1
  ),
  acq as (
    select
      coalesce(sum((stats->>'failed')::int), 0) as failed_3h,
      coalesce(bool_or((stats->>'failed')::int >= 5 and (stats->>'done')::int = 0), false) as cookie_suspect
    from public.pipeline_runs
    where kind = 'acquire' and created_at > now() - interval '3 hours'
  ),
  failed_videos as (
    select
      count(*) as cnt,
      coalesce(jsonb_agg(jsonb_build_object('title', left(title, 80), 'error', left(coalesce(last_error, ''), 120))
        order by created_at desc) filter (where rn <= 5), '[]'::jsonb) as samples
    from (
      select title, last_error, created_at,
             row_number() over (order by created_at desc) as rn
      from public.videos v, cutoff
      where v.status = 'failed' and v.published_at >= cutoff.ts
        and v.created_at > now() - interval '24 hours'
    ) t
  ),
  eligible_unsummarized as (
    select count(*) as cnt
    from public.videos v, cutoff
    where v.status = 'done'
      and v.published_at >= cutoff.ts
      and v.duration_seconds >= 120 and v.duration_seconds < 7200
      and not exists (select 1 from public.summaries s where s.video_id = v.id)
  ),
  delivery as (
    select count(*) filter (where status <> 'sent' and created_at > now() - interval '24 hours') as failures_24h
    from public.deliveries
  ),
  dead_pending as (
    select count(*) as cnt from public.videos v, cutoff
    where v.status = 'pending' and v.published_at < cutoff.ts
  ),
  today as (
    select
      (select count(*) from public.videos v, cutoff, today_kst
         where v.published_at >= cutoff.ts and (v.created_at at time zone 'Asia/Seoul')::date = today_kst.d) as detected,
      (select count(distinct s.video_id) from public.summaries s, today_kst
         where (s.created_at at time zone 'Asia/Seoul')::date = today_kst.d) as summarized,
      (select count(*) from public.deliveries d, today_kst
         where d.status = 'sent' and (d.created_at at time zone 'Asia/Seoul')::date = today_kst.d) as delivered
  ),
  recent_median as (
    -- 오늘 제외, 최근 며칠의 일별 요약 영상 수 중앙값(1회성 백필일 왜곡 방지 위해 avg 대신 median).
    select coalesce(round(percentile_cont(0.5) within group (order by c))::int, 0) as med
    from (
      select count(distinct s.video_id) as c
      from public.summaries s, today_kst
      where s.created_at > now() - interval '8 days'
        and (s.created_at at time zone 'Asia/Seoul')::date < today_kst.d
      group by (s.created_at at time zone 'Asia/Seoul')::date
    ) x
  )
  select jsonb_build_object(
    'nowKst', to_char(now() at time zone 'Asia/Seoul', 'MM-DD HH24:MI'),
    'lastPipelineRunAgeMin', (select age_min from last_pipeline),
    'failedRuns', (select arr from failed_runs),
    'detectFailures', (select detect_failures from latest_detect),
    'acquireFailed3h', (select failed_3h from acq),
    'cookieExpirySuspected', (select cookie_suspect from acq),
    'failedVideosPostCutoff', jsonb_build_object(
      'count', (select cnt from failed_videos),
      'samples', (select samples from failed_videos)
    ),
    'eligibleUnsummarized', (select cnt from eligible_unsummarized),
    'deliveryFailures24h', (select failures_24h from delivery),
    'deadDataPending', (select cnt from dead_pending),
    'today', (select to_jsonb(today) from today),
    'summarizedRecentMedian', (select med from recent_median)
  );
$$;

revoke execute on function public.pipeline_health_snapshot() from public, anon, authenticated;
grant execute on function public.pipeline_health_snapshot() to service_role;
