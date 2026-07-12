-- OTP 남용 방지 (보안 8a/8b): 요청 쿨다운 + 검증 시도 상한.
-- otp_attempts: 검증 실패 누적 횟수 — 상한(OTP_MAX_ATTEMPTS) 초과 시 pending 무효화(브루트포스 차단).
-- otp_requested_at: 마지막 OTP 요청 시각 — 요청 쿨다운(OTP_COOLDOWN_MS)으로 임의 주소 이메일 폭탄 방지.
-- 둘 다 service_role(서버 액션 admin client)만 write. user_settings 는 컴럼 레벨 grant 라
-- authenticated 에 이 컴럼 update 권한을 주지 않으므로 별도 revoke/grant 불필요.
alter table public.user_settings
  add column if not exists otp_attempts int not null default 0,
  add column if not exists otp_requested_at timestamptz;
