-- 스키마 드리프트 복구: membership.poc_warned.
-- run-cycle 의 PoC 종료 7일전 안내(1회)가 이 컬럼을 read/write 하는데, 정작 이를 생성하는
-- 마이그레이션이 없었다(라이브 DB엔 수동 추가돼 있었음). 재빌드(db reset) 시 멤버십 주기가
-- 이 컬럼을 못 찾아 크래시하므로, 라이브 정의(boolean NOT NULL default false)와 일치하는
-- 멱등 마이그레이션으로 이력을 정합화한다. 라이브 적용은 no-op(이미 존재).
alter table public.membership
  add column if not exists poc_warned boolean not null default false;
