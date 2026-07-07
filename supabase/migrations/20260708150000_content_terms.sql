-- 콘텐츠 어려운-용어 추출 캐시 (영상 단위, 사용자 공유). 한 번 추출하면 저장해두고
-- 이후엔 빠르게 로드하며, 다른 사용자도 저장된 결과를 즉시 사용한다.
create table content_terms (
  video_id uuid primary key references videos (id) on delete cascade,
  terms text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table content_terms enable row level security;
-- 읽기는 인증 사용자 공통(공유 캐시). 쓰기는 service_role 만(정책 없음 = 차단).
create policy "content_terms - authed read" on content_terms
  for select to authenticated using (true);
