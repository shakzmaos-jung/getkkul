-- user_settings.exclude_over_2h: 2시간 이상 영상을 다이제스트에서 제외(기본 true, 사용자 토글 가능).
-- 1분 미만(Shorts) 제외는 항상 적용되는 정책이라 별도 저장하지 않는다(코드 상수).
alter table public.user_settings
  add column if not exists exclude_over_2h boolean not null default true;

comment on column public.user_settings.exclude_over_2h is
  '2시간 이상 영상 다이제스트 제외(기본 true, 사용자 토글). 1분 미만은 항상 제외(비저장).';
