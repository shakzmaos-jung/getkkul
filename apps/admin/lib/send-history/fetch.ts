import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { maskEmail } from '@getkkul/domain';
import type { SendHistory } from './types';
import type { ParsedSendQuery } from './derive';

/**
 * 이메일·푸시 발송 이력 조회. **원문 이메일은 이 함수 안에서만** 다루고 maskEmail 로 마스킹해 반환.
 */
export async function fetchSendHistory(q: ParsedSendQuery): Promise<SendHistory> {
  await requireAdmin(); // 심층 방어(미들웨어 우회 대비)
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_send_history', {
    p_slot: q.slot ?? null,
    p_status: q.status ?? null,
    p_search: q.search ?? null,
    p_from: null,
    p_to: null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (error) throw new Error(`get_send_history 실패: ${error.message}`);
  if (!data) throw new Error('get_send_history 빈 응답');
  const raw = data as unknown as SendHistory;
  return {
    total: raw.total,
    rows: raw.rows.map((r) => ({ ...r, email: maskEmail(r.email) })),
  };
}
