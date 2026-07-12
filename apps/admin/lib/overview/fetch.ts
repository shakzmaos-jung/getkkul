import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OverviewData } from './types';

/** 관제 홈 데이터 조회 (service_role RPC, AC-OV-1c). 실패는 호출부에서 error 상태로 처리. */
export async function fetchOverview(): Promise<OverviewData> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_admin_overview');
  if (error) throw new Error(`get_admin_overview 실패: ${error.message}`);
  if (!data) throw new Error('get_admin_overview 빈 응답');
  return data as unknown as OverviewData;
}
