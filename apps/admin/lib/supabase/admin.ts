import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * 관제 read-layer 전용 service_role 클라이언트 (ADR-A2). **서버에서만** 사용한다.
 * `server-only` 가드로 클라이언트 번들 유입을 차단. service_role 키는 어드민 배포 env 전용,
 * `NEXT_PUBLIC_` 에 절대 두지 않는다.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
