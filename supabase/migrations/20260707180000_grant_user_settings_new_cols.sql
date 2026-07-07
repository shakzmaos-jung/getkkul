-- user_settings 는 컬럼 레벨 grant 라 새로 추가된 컬럼에 authenticated UPDATE 권한이 자동 부여되지 않음.
-- → 앱(authenticated)에서 exclude_over_2h/delivery_slots 저장 시 권한 거부로 실패.
-- 해당 컬럼에 authenticated UPDATE 를 명시 부여(RLS 로 본인 행만 갱신).
grant update (exclude_over_2h, delivery_slots) on public.user_settings to authenticated;
