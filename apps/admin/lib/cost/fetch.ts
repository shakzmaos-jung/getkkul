import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { CostBreakdown } from './types';

/** 비용·쿼터 조회 (AC-CO-1). from/to 미지정 시 최근 30일. */
export async function fetchCostBreakdown(
  from?: string,
  to?: string,
): Promise<CostBreakdown> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증
  const supabase = createAdminClient();
  const args: Record<string, string> = {};
  if (from) args.p_from = from;
  if (to) args.p_to = to;
  const { data, error } = await supabase.rpc(
    'get_cost_breakdown',
    Object.keys(args).length ? args : {},
  );
  if (error) throw new Error(`get_cost_breakdown 실패: ${error.message}`);
  if (!data) throw new Error('get_cost_breakdown 빈 응답');
  return data as unknown as CostBreakdown;
}
