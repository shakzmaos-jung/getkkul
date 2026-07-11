-- 발송 슬롯 21:30(KST) 추가. delivery_slot enum 에 '2130' 값을 붙인다(1730 뒤 = 정렬 순서 유지).
-- 주의: ADD VALUE 는 같은 트랜잭션에서 곧바로 사용할 수 없으므로, 값 추가만 별도 마이그레이션으로
-- 분리한다(기본값·컬럼 변경은 다음 파일 20260711060000 에서 수행).
alter type delivery_slot add value if not exists '2130';
