import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * 파이프라인(GitHub Actions, 독립 Node) 전용 service_role 클라이언트.
 * Next 앱의 admin.ts 는 'server-only' 가드가 있어 Node 스크립트에서 import 할 수 없으므로 분리한다.
 * GH Actions 는 SUPABASE_URL, 로컬은 NEXT_PUBLIC_SUPABASE_URL 을 사용할 수 있게 둘 다 허용.
 */
export function createPipelineClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
