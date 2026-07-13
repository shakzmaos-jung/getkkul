-- Fix #2 (인시던트 2026-07-13): 헬스체크 발송 정체 신호 추가.
-- 배경: candidateVideos 가 서버 max-rows(1000) 상한에 걸려 고볼륨 구독자가 조용히 미발송됐는데,
-- 기존 헬스체크는 '실패 행(status≠sent)' 수만 봐서 "후보는 있는데 0 배송"(무음 실패)을
-- 구조적으로 못 잡아 4일간 미탐됐다. 이를 닫기 위해 '발송 정체 사용자 수' 결과 신호를 추가한다.
--
-- 정의(stuckDeliveryUsers): 아래를 모두 만족하는 사용자 수.
--   (1) delivery_slots 가 비어있지 않다(발송을 원함).
--   (2) 최근 26h 내 status='sent' 발송이 0건이다(하루 최소 1슬롯은 지났음 → 무음 판정).
--   (3) 요약(ko, 사용자 length_mode) 준비된 적격 done 영상이 있는데 18h+ 미발송이다.
--       적격 = 멤버십 publish-floor(가입시각) 이후(=deliverAll 과 동일) + active_since 이후 +
--             길이 필터(≥120s, exclude_over_2h 면 <7200s) + 아직 미발송.
-- 오탐 방지: (2)의 26h 게이트가 핵심 — 정상 파이프라인은 적격 영상이 있으면 26h 내 반드시
--   무언가 발송하므로, 고볼륨 백로그를 30/슬롯으로 정상 드레인 중인 사용자는 잡지 않는다.
--   floor 는 컷오프(2026-07-09T15:00Z) 이상으로 강제해 신규 채널 과거영상(dead data) 오탐도 배제.

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
  stuck_delivery as (
    select count(*) as user_cnt
    from public.user_settings us, cutoff
    where coalesce(array_length(us.delivery_slots, 1), 0) > 0
      and not exists (
        select 1 from public.deliveries d
        where d.user_id = us.user_id and d.status = 'sent'
          and d.created_at > now() - interval '26 hours'
      )
      and exists (
        select 1
        from public.subscriptions sub
        join public.videos v on v.channel_id = sub.channel_id
        left join public.membership m on m.user_id = us.user_id
        where sub.user_id = us.user_id and sub.paused = false
          and v.status = 'done'
          and v.published_at >= greatest(cutoff.ts, coalesce(m.created_at, cutoff.ts))
          and (sub.active_since is null or v.created_at >= sub.active_since)
          and v.duration_seconds >= 120
          and (not coalesce(us.exclude_over_2h, true) or v.duration_seconds < 7200)
          and v.created_at < now() - interval '18 hours'
          and exists (
            select 1 from public.summaries s
            where s.video_id = v.id and s.language = 'ko'
              and s.length_mode = coalesce(us.summary_length, 'normal')
          )
          and not exists (
            select 1 from public.deliveries d2
            where d2.user_id = us.user_id and d2.video_id = v.id and d2.status = 'sent'
          )
      )
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
    'stuckDeliveryUsers', (select user_cnt from stuck_delivery),
    'deadDataPending', (select cnt from dead_pending),
    'today', (select to_jsonb(today) from today),
    'summarizedRecentMedian', (select med from recent_median)
  );
$$;

revoke execute on function public.pipeline_health_snapshot() from public, anon, authenticated;
grant execute on function public.pipeline_health_snapshot() to service_role;
