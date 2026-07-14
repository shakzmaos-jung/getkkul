-- 읽기 테마 선호 저장(기기 간 유지). 값: system|light|dark|paper|grayscale|nightshift.
-- null = 미설정(클라이언트가 system 으로 처리). 기존 RLS(own settings) 로 본인 행만 접근.
alter table public.user_settings add column if not exists theme text;
comment on column public.user_settings.theme is
  '읽기 테마 선호(system|light|dark|paper|grayscale|nightshift). null=미설정→클라이언트 기본 system.';
