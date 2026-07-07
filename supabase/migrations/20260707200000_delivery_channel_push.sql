-- 푸시 발송 기록을 위해 delivery_channel enum 에 'push' 추가(가산적).
-- 멱등성 제약 UNIQUE(user_id, video_id)은 유지(공유 원장): 같은 슬롯에 이메일·푸시를
-- 함께 받을 수 있고(AC-E1.3), 한 번 전달된 항목은 다음 슬롯에서 재발송되지 않는다.
alter type public.delivery_channel add value if not exists 'push';
