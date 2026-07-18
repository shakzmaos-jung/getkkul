import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { CorrectionLog } from './types';
import type { ParsedCorrectionQuery } from './derive';

/** 오타 교정 로그 조회(필터·검색·페이지네이션). read-only · service_role. 개인정보 없음(마스킹 불필요). */
export async function fetchCorrections(q: ParsedCorrectionQuery): Promise<CorrectionLog> {
  await requireAdmin(); // 심층 방어(미들웨어 우회 대비)
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_term_corrections', {
    p_search: q.search ?? null,
    p_method: q.method ?? null,
    p_form: q.form ?? null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (error) throw new Error(`get_term_corrections 실패: ${error.message}`);
  if (!data) throw new Error('get_term_corrections 빈 응답');
  return data as unknown as CorrectionLog;
}
