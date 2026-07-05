-- 구독 채널 표시용 메타: 채널 아바타(썸네일) URL + @핸들.
-- 신규 구독 시 YouTube Data API 로 채우고, 기존 채널은 1회 백필.
alter table public.subscriptions
  add column if not exists channel_thumbnail text,
  add column if not exists channel_handle text;
