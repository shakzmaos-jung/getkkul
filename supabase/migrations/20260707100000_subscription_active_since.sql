-- subscriptions.active_since: 다이제스트 기준선.
-- 이 시각 이후 감지(videos.created_at)된 영상만 해당 구독의 다이제스트(피드·홈·발송)로 제공한다.
-- 정지해제 시 now() 로 설정 → 일시정지 동안 밀린 콘텐츠가 한꺼번에 노출/발송되는 것을 방지.
-- NULL = 제한 없음(구독 채널의 전체 이력 제공, 기존 동작 유지).
alter table public.subscriptions
  add column if not exists active_since timestamptz;

comment on column public.subscriptions.active_since is
  '다이제스트 기준선. 이후 감지된 영상만 제공. 정지해제 시 now(). NULL=제한 없음.';
