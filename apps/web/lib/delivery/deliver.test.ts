import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deliverAll } from './deliver';
import type { Notifier } from '@/lib/notify/notify';
import type { PushNotifier } from '@/lib/notify/web-push';

/**
 * deliverAll 오케스트레이터의 핵심 보장(H6 격리·멱등)을 검증한다. 최고복잡도 파일이지만
 * supabase/notifier/pushNotifier 가 주입 가능하므로, 최소 fake 로 분기를 직접 태운다.
 *
 * fake supabase: 테이블별 canned 결과를 돌려주는 얇은 체이너블/thenable. select 체인은
 * await 시 canned[table] 을, maybeSingle 은 singles[table] 을 반환하고, upsert/delete 는 write 로그에 쌓는다.
 */
type Rows = Record<string, unknown>[];

function makeSupabase(canned: Record<string, Rows>, singles: Record<string, unknown>) {
  const writes = {
    deliveries: [] as Record<string, unknown>[],
    usage: [] as Record<string, unknown>[],
    deletedEndpoints: [] as string[],
  };
  const from = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      order: () => b,
      maybeSingle: () => Promise.resolve({ data: singles[table] ?? null, error: null }),
      upsert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        if (table === 'deliveries') writes.deliveries.push(...arr);
        else if (table === 'membership_usage') writes.usage.push(...arr);
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        in: (_col: string, vals: string[]) => {
          writes.deletedEndpoints.push(...vals);
          return Promise.resolve({ error: null });
        },
      }),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ data: canned[table] ?? [], error: null }).then(res, rej),
    };
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, writes };
}

/** 한 사용자 + done 요약영상 1건 시나리오의 canned 세트. */
function oneUserFixture(overrides: { videos?: Rows } = {}) {
  return {
    canned: {
      profiles: [{ id: 'u1', email: 'u1@example.com' }],
      user_settings: [
        {
          user_id: 'u1',
          delivery_email: null,
          delivery_slots: ['0730'],
          push_slot_0730: true,
          push_slot_1130: false,
          push_slot_1730: false,
          push_slot_2130: false,
          skip_empty_push: true,
          skip_empty_email: true,
        },
      ],
      push_subscriptions: [{ user_id: 'u1', endpoint: 'e1', p256dh: 'p', auth: 'a' }],
      membership: [],
      membership_usage: [],
      // candidateVideos 내부 조회들
      subscriptions: [{ channel_id: 'c1', active_since: null }],
      videos: overrides.videos ?? [
        {
          id: 'vid1',
          title: 'T',
          url: 'http://x/vid1',
          channel_id: 'c1',
          created_at: '2026-07-11T00:00:00Z',
          published_at: '2026-07-11T00:00:00Z',
          duration_seconds: 600,
        },
      ],
      summaries: [{ video_id: 'vid1', headline: 'H', core_text: 'C' }],
      deliveries: [], // 아직 발송된 것 없음
    } as Record<string, Rows>,
    singles: {
      user_settings: { summary_length: 'normal', exclude_over_2h: true },
    } as Record<string, unknown>,
  };
}

const okPush: PushNotifier = {
  send: async () => [{ endpoint: 'e1', ok: true, gone: false }],
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('deliverAll — 채널 독립 격리 & 멱등(H6)', () => {
  it('이메일 실패해도 푸시가 성공하면 delivered 로 기록하고 잡은 계속된다', async () => {
    const { canned, singles } = oneUserFixture();
    const { client, writes } = makeSupabase(canned, singles);
    const notifier: Notifier = {
      send: vi.fn(async () => {
        throw new Error('resend 500');
      }),
    };

    const r = await deliverAll('0730', {
      supabase: client,
      notifier,
      pushNotifier: okPush,
      nowIso: '2026-07-12T00:00:00Z',
    });

    expect(r.pushSent).toBe(1); // 푸시 성공
    expect(r.sent).toBe(0); // 이메일 실패 → 이메일 발송수 0
    expect(r.failed).toBe(0); // 한 채널이라도 성공 → failed 아님
    // 원장에 새 항목이 sent 로 멱등 기록(onConflict user_id,video_id).
    expect(writes.deliveries).toEqual([
      expect.objectContaining({ user_id: 'u1', video_id: 'vid1', status: 'sent', channel: 'push' }),
    ]);
  });

  it('이메일 성공 경로: sent 집계 + 원장 기록(푸시 없음)', async () => {
    const { canned, singles } = oneUserFixture();
    const { client, writes } = makeSupabase(canned, singles);
    const notifier: Notifier = { send: vi.fn(async () => ({ id: 'm1' })) };

    const r = await deliverAll('0730', {
      supabase: client,
      notifier,
      pushNotifier: null, // 푸시 비활성
      nowIso: '2026-07-12T00:00:00Z',
    });

    expect(r.sent).toBe(1);
    expect(r.failed).toBe(0);
    expect(writes.deliveries).toEqual([
      expect.objectContaining({ user_id: 'u1', video_id: 'vid1', status: 'sent', channel: 'email' }),
    ]);
  });

  it('이메일만 시도했는데 실패하면 failed 로 기록(다음 슬롯 재시도)', async () => {
    const { canned, singles } = oneUserFixture();
    const { client, writes } = makeSupabase(canned, singles);
    const notifier: Notifier = {
      send: vi.fn(async () => {
        throw new Error('smtp down');
      }),
    };

    const r = await deliverAll('0730', {
      supabase: client,
      notifier,
      pushNotifier: null,
      nowIso: '2026-07-12T00:00:00Z',
    });

    expect(r.sent).toBe(0);
    expect(r.failed).toBe(1);
    expect(writes.deliveries).toEqual([
      expect.objectContaining({ user_id: 'u1', video_id: 'vid1', status: 'failed' }),
    ]);
  });

  it('신규 항목이 없고 skip_empty 면 아무것도 발송하지 않는다', async () => {
    const { canned, singles } = oneUserFixture({ videos: [] });
    const { client, writes } = makeSupabase(canned, singles);
    const notifier: Notifier = { send: vi.fn(async () => ({ id: 'm1' })) };

    const r = await deliverAll('0730', {
      supabase: client,
      notifier,
      pushNotifier: null,
      nowIso: '2026-07-12T00:00:00Z',
    });

    expect(notifier.send).not.toHaveBeenCalled();
    expect(r.sent).toBe(0);
    expect(r.empty).toBe(0);
    expect(writes.deliveries).toEqual([]);
  });
});
