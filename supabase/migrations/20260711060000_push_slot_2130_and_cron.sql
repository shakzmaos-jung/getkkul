-- 발송 슬롯 21:30 추가 (2/2): 기본값·푸시 컬럼·grant·pg_cron 스케줄.
-- (enum 값 '2130' 은 20260711050000 에서 이미 추가·커밋됨.)

-- 이메일 슬롯 기본값: 신규 사용자는 4슬롯 전체 수신(기존 all-on 정책 유지).
-- 기존 사용자 행은 저장된 배열을 유지 → 설정 화면에서 21:30 을 직접 켜서 opt-in.
alter table public.user_settings
  alter column delivery_slots
  set default array['0730', '1130', '1730', '2130']::delivery_slot[];

-- 21:30 푸시 토글 컬럼(기존 슬롯과 동일하게 기본 off = opt-in).
alter table public.user_settings
  add column if not exists push_slot_2130 boolean not null default false;

-- 컬럼 레벨 grant 테이블 → 새 컬럼 UPDATE 를 authenticated 에 명시 부여.
grant update (push_slot_2130) on public.user_settings to authenticated;

-- pg_cron deliver 디스패치에 21:30 KST(=12:30 UTC) 추가. 같은 이름은 upsert.
select cron.schedule('deliver-dispatch', '30 22,2,8,12 * * *', 'select public.dispatch_deliver();');
