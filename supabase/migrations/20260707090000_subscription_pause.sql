-- subscriptions.paused: 구독 채널 일시정지 여부.
-- true 면 해당 채널의 다이제스트를 피드·홈·발송에서 제외한다(per-사용자).
-- 감지(detect)는 채널을 여러 사용자가 공유하므로 전역 유지 — 필터는 표시/발송 레이어에서 수행.
alter table public.subscriptions
  add column if not exists paused boolean not null default false;

comment on column public.subscriptions.paused is
  '일시정지 여부. true 면 다이제스트를 피드·발송에서 제외(감지는 유지).';
