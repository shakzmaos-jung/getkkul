-- user_settings.delivery_slots: 사용자가 수신할 발송 슬롯(멀티 선택).
-- 발송(deliverAll)은 슬롯별로 실행되며, 현재 슬롯이 이 배열에 포함된 사용자에게만 전송한다.
-- 기본값은 3회 전체 → 기존 동작 유지. 빈 배열이면 이메일 발송 없음(앱에서만 열람).
alter table public.user_settings
  add column if not exists delivery_slots delivery_slot[] not null
    default array['0730', '1130', '1730']::delivery_slot[];

comment on column public.user_settings.delivery_slots is
  '수신할 발송 슬롯(멀티). 기본 3회 전체. 발송 시 현재 슬롯 포함 사용자에게만 전송.';
