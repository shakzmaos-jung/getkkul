-- 수신 이메일 설정 + OTP 인증 (사용자 요청 기능)
-- delivery_email: 검증된 수신 이메일 (null = profiles.email 사용)
-- pending_email/otp_hash/otp_expires_at: OTP 인증 대기 상태

alter table public.user_settings
  add column delivery_email text,
  add column pending_email text,
  add column otp_hash text,
  add column otp_expires_at timestamptz;

-- delivery_email/otp 는 사용자가 직접 못 바꾸게(서버 액션 service_role 만 write).
-- 사용자 클라이언트(authenticated)는 summary_length 컬럼만 update 허용.
revoke update on public.user_settings from authenticated;
grant update (summary_length) on public.user_settings to authenticated;
