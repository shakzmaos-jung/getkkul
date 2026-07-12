import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { AdminRole } from '@/lib/database.types';

export type AdminProfile = { email: string | null; role: AdminRole | null };

/**
 * 현재 로그인한 어드민의 이메일 + 역할. 본인 세션으로 조회(admin_users RLS self-read) →
 * service_role 불필요. 사이드바 프로필 표시용.
 */
export async function getAdminProfile(): Promise<AdminProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { email: null, role: null };

  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  return { email: user.email ?? null, role: data?.role ?? null };
}
