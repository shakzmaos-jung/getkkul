import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * 서버 전용 service_role 클라이언트 — RLS 를 우회한다 (SSR §G: videos/summaries 쓰기, deliveries 쓰기).
 * 절대 클라이언트 번들에 포함되면 안 된다 ('server-only' 로 강제).
 * 감지·처리(전사·요약) 및 발송 파이프라인 등 백엔드 잡에서만 사용.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
