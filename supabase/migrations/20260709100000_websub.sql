-- WebSub(PubSubHubbub) 푸시 감지 (pipeline-reliability REQ-A). 채널 단위 구독 상태.
create type websub_status as enum ('active', 'pending', 'expired', 'unsubscribed');

create table websub_subscriptions (
  channel_id text primary key,
  status websub_status not null default 'pending',
  lease_expires_at timestamptz,
  subscribed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
create index idx_websub_lease on websub_subscriptions (lease_expires_at);

-- 운영 테이블: service_role 전용(정책 없음 = authenticated/anon 차단).
alter table websub_subscriptions enable row level security;

-- 웹훅(즉시 처리, G)이 서비스 롤로 dispatch_pipeline 을 호출할 수 있게 실행 권한 부여.
grant execute on function public.dispatch_pipeline() to service_role;
