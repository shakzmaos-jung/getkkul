-- videos.duration_seconds: YouTube 영상 길이(초).
-- YouTube Data API videos.list(part=contentDetails)의 ISO8601 duration 을 초로 파싱해 저장.
-- NULL = 미취득(구영상 백필 전 / API 실패 / 라이브·프리미어 등 길이 없음).
alter table public.videos
  add column if not exists duration_seconds integer;

comment on column public.videos.duration_seconds is
  'YouTube 영상 길이(초). contentDetails.duration 파싱값. NULL=미취득.';
