import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { GrowthMetrics } from './types';

/** 그로스 지표 조회 (AC-GR-1). */
export async function fetchGrowthMetrics(): Promise<GrowthMetrics> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_growth_metrics');
  if (error) throw new Error(`get_growth_metrics 실패: ${error.message}`);
  if (!data) throw new Error('get_growth_metrics 빈 응답');
  return data as unknown as GrowthMetrics;
}
