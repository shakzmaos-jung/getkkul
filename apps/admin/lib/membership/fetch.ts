import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { MembershipHistory } from './types';
import type { ParsedMembershipQuery } from './derive';

/** 멤버십(결제) 이력 조회. email 원문은 이 함수 안에서만 다루고 maskEmail 로 마스킹해 반환. */
export async function fetchMembershipHistory(q: ParsedMembershipQuery): Promise<MembershipHistory> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_membership_history', {
    p_status: q.status ?? null,
    p_search: q.search ?? null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (error) throw new Error(`get_membership_history 실패: ${error.message}`);
  if (!data) throw new Error('get_membership_history 빈 응답');
  const raw = data as unknown as MembershipHistory;
  return {
    total: raw.total,
    rows: raw.rows.map((r) => ({ ...r, email: r.email ? maskEmail(r.email) : null })),
  };
}
