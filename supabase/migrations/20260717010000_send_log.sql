-- 발송 이벤트 로그(append-only) + 슬롯 멱등 클레임.
-- deliver 잡이 (user, slot, day) 당 1행을 원자적으로 선점 → 어떤 트리거·동시성이든 슬롯당 1회 발송 보장.
-- deliveries(= user,video 멱등 원장)와 별개: 빈 발송("없음")·푸시·실패까지 정확히 남긴다. 어드민 '발송 이력' 데이터원.

create table if not exists public.send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot public.delivery_slot not null,
  send_date date not null,                       -- 슬롯의 KST 날짜(멱등 키 구성요소)
  item_count int not null default 0,
  email_status text,                             -- 'sent' | 'failed' | 'skipped' | null(미해당)
  push_status text,                              -- 'sent' | 'failed' | 'skipped' | null(미해당)
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot, send_date)              -- 멱등 클레임 키
);
create index if not exists send_log_created_idx on public.send_log (created_at desc);
create index if not exists send_log_slot_idx on public.send_log (slot);

alter table public.send_log enable row level security;
-- 사용자 접근 불필요(운영 로그). 발송 잡·어드민 RPC 는 service_role 로만 접근.
grant all on public.send_log to service_role;

-- 어드민 발송 이력 조회(필터·검색·페이지네이션). read-only · service_role. 이메일 원문 반환→fetch 레이어 마스킹.
create or replace function public.get_send_history(
  p_slot text default null,        -- '0730'|'1130'|'1730'|'2130'|null(전체)
  p_status text default null,      -- 'sent'|'failed'|'empty'|null(전체)
  p_search text default null,      -- 이메일 ILIKE
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb language sql security definer set search_path='' as $$
  with filtered as (
    select sl.id, sl.created_at, sl.slot, sl.send_date, sl.item_count,
           sl.email_status, sl.push_status, sl.error, p.email
    from public.send_log sl
    join public.profiles p on p.id = sl.user_id
    where (p_slot is null or sl.slot = p_slot::public.delivery_slot)
      and (p_from is null or sl.created_at >= p_from)
      and (p_to   is null or sl.created_at <  p_to)
      and (p_status is null
           or (p_status = 'empty'  and sl.item_count = 0)
           or (p_status = 'sent'   and sl.email_status = 'sent')
           or (p_status = 'failed' and (sl.email_status = 'failed' or sl.push_status = 'failed')))
      and (p_search is null or p_search = '' or p.email ilike '%'||p_search||'%')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'atKst', to_char(page.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS'),
        'email', page.email,
        'slot', page.slot::text,
        'itemCount', page.item_count,
        'emailStatus', page.email_status,
        'pushStatus', page.push_status,
        'error', page.error
      ) order by page.created_at desc)
      from (select * from filtered order by created_at desc limit p_limit offset p_offset) page
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_send_history(text, text, text, timestamptz, timestamptz, int, int) from public, anon, authenticated;
grant execute on function public.get_send_history(text, text, text, timestamptz, timestamptz, int, int) to service_role;
