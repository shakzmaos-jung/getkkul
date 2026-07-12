import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { maskEmail } from '@getkkul/domain';
import type { OpsData } from './types';

/**
 * 운영 데이터 조회 (AC-OP-1a). **원문 이메일은 이 함수 안에서만** 다루고 maskEmail 로 마스킹해
 * 반환한다 → 페이지/브라우저엔 마스킹된 값만 전달(개인정보 최소 노출).
 */
export async function fetchOpsData(digestLimit = 30): Promise<OpsData> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_ops_data', {
    p_digest_limit: digestLimit,
  });
  if (error) throw new Error(`get_ops_data 실패: ${error.message}`);
  if (!data) throw new Error('get_ops_data 빈 응답');
  const raw = data as unknown as OpsData;
  return {
    subscribers: raw.subscribers.map((s) => ({ ...s, email: maskEmail(s.email) })),
    recentDigests: raw.recentDigests.map((d) => ({ ...d, email: maskEmail(d.email) })),
  };
}
