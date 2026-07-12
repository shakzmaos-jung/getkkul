import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { savePushSubscription, deletePushSubscription } from './subscriptions';

type Call = { op: string; table: string; row?: unknown; opts?: unknown; filters?: [string, string][] };

/** upsert/delete 호출을 기록하는 mock supabase. */
function mockSupabase(record: (c: Call) => void, error: { message: string } | null = null) {
  const client = {
    from(table: string) {
      const filters: [string, string][] = [];
      const api = {
        upsert(row: unknown, opts: unknown) {
          record({ op: 'upsert', table, row, opts });
          return Promise.resolve({ error });
        },
        delete() {
          return api;
        },
        eq(c: string, v: string) {
          filters.push([c, v]);
          return api;
        },
        then(res: (v: { error: unknown }) => void) {
          record({ op: 'delete', table, filters });
          res({ error });
        },
      };
      return api;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

const sub = { endpoint: 'https://push/ep1', keys: { p256dh: 'P', auth: 'A' } };

describe('savePushSubscription', () => {
  it('endpoint onConflict upsert 로 본인 구독 저장', async () => {
    const calls: Call[] = [];
    const r = await savePushSubscription(mockSupabase((c) => calls.push(c)), 'u1', sub, 'UA');
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({
      op: 'upsert',
      table: 'push_subscriptions',
      row: { user_id: 'u1', endpoint: 'https://push/ep1', p256dh: 'P', auth: 'A', user_agent: 'UA' },
      opts: { onConflict: 'endpoint' },
    });
  });
  it('에러 시 ok=false', async () => {
    const r = await savePushSubscription(mockSupabase(() => {}, { message: 'x' }), 'u1', sub, null);
    expect(r.ok).toBe(false);
  });
});

describe('deletePushSubscription', () => {
  it('user_id+endpoint 로 삭제', async () => {
    const calls: Call[] = [];
    const r = await deletePushSubscription(mockSupabase((c) => calls.push(c)), 'u1', 'https://push/ep1');
    expect(r.ok).toBe(true);
    expect(calls[0]).toMatchObject({
      op: 'delete',
      table: 'push_subscriptions',
      filters: [
        ['user_id', 'u1'],
        ['endpoint', 'https://push/ep1'],
      ],
    });
  });
});
