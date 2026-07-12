import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { IncidentLog } from './types';

/** 인시던트 로그 조회 (AC-AL-1a). */
export async function fetchIncidentLog(days = 7): Promise<IncidentLog> {
  await requireAdmin(); // 심층 방어: 미들웨어 우회 시에도 인가 재검증
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_incident_log', { p_days: days });
  if (error) throw new Error(`get_incident_log 실패: ${error.message}`);
  if (!data) throw new Error('get_incident_log 빈 응답');
  return data as unknown as IncidentLog;
}
