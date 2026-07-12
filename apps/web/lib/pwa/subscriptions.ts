import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { PushKeys } from '@/lib/pwa/push-client';

type DB = SupabaseClient<Database>;

/** 푸시 구독 저장(upsert, endpoint 유니크). user_id 로 본인에 연결(RLS AC-C1.3). */
export async function savePushSubscription(
  supabase: DB,
  userId: string,
  sub: PushKeys,
  userAgent: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
    },
    { onConflict: 'endpoint' },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** endpoint 로 본인 구독 삭제(AC-C1.4). */
export async function deletePushSubscription(
  supabase: DB,
  userId: string,
  endpoint: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  return error ? { ok: false, error: error.message } : { ok: true };
}
