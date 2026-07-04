-- RLS 정책 (SSR §G, H4)
-- 사용자 스코프(profiles/user_settings/subscriptions/deliveries): 본인 행만 접근
-- 공용 읽기(videos/summaries): 인증 사용자 읽기, 쓰기는 service_role 만 (정책 없음 = 차단)
-- 참고: auth.uid() 는 (select auth.uid()) 로 감싸 행별 재평가를 피한다(성능).

alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table summaries enable row level security;
alter table deliveries enable row level security;

-- ── profiles (insert 는 트리거 security definer 가 수행) ──
create policy "own profile - select" on profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile - update" on profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own profile - delete" on profiles
  for delete to authenticated using (id = (select auth.uid()));

-- ── user_settings ─────────────────────────────────────
create policy "own settings - select" on user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own settings - insert" on user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own settings - update" on user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── subscriptions (본인 행 전체 CRUD) ──────────────────
create policy "own subs - select" on subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own subs - insert" on subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own subs - update" on subscriptions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subs - delete" on subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── deliveries (본인 발송 이력 조회만; 쓰기는 service_role) ──
create policy "own deliveries - select" on deliveries
  for select to authenticated using (user_id = (select auth.uid()));

-- ── videos / summaries (인증 사용자 읽기 전용) ─────────
create policy "videos - authed read" on videos
  for select to authenticated using (true);
create policy "summaries - authed read" on summaries
  for select to authenticated using (true);
