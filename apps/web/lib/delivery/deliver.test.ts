import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deliverAll, candidateVideos } from './deliver';
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
    sendLog: [] as Record<string, unknown>[], // 클레임 insert
    sendLogUpdates: [] as Record<string, unknown>[], // 결과 update
  };
  const claimed = new Set<string>(); // (user,slot,send_date) 멱등 — ON CONFLICT DO NOTHING 시뮬
  const from = (table: string) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      gte: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve({ data: singles[table] ?? null, error: null }),
      upsert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        if (table === 'deliveries') writes.deliveries.push(...arr);
        else if (table === 'membership_usage') writes.usage.push(...arr);
        else if (table === 'send_log') writes.sendLog.push(...arr);
        // send_log 클레임: (user,slot,send_date) 최초면 행 반환, 충돌이면 [](do nothing).
        let claimData: Record<string, unknown>[] = [];
        if (table === 'send_log') {
          const r = arr[0] as Record<string, string>;
          const key = `${r.user_id}:${r.slot}:${r.send_date}`;
          if (!claimed.has(key)) {
            claimed.add(key);
            claimData = [{ id: `sl-${claimed.size}` }];
          }
        }
        return {
          select: () => Promise.resolve({ data: claimData, error: null }),
          then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
            Promise.resolve({ error: null }).then(res, rej),
        };
      },
      update: (vals: Record<string, unknown>) => ({
        eq: () => {
          writes.sendLogUpdates.push(vals);
          return Promise.resolve({ error: null });
        },
      }),
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
      deliveries: [],
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

    expect(r.pushSent).toBe(1);
    expect(r.sent).toBe(0);
    expect(r.failed).toBe(0);
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
      pushNotifier: null,
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

  it('같은 슬롯 2회 실행 시 2번째는 클레임 충돌로 스킵(슬롯당 1회 발송)', async () => {
    const { canned, singles } = oneUserFixture();
    const { client } = makeSupabase(canned, singles); // 같은 client → 클레임 공유
    const notifier: Notifier = { send: vi.fn(async () => ({ id: 'm1' })) };
    const opts = {
      supabase: client,
      notifier,
      pushNotifier: null,
      nowIso: '2026-07-12T00:00:00Z',
    } as const;

    const r1 = await deliverAll('0730', opts);
    const r2 = await deliverAll('0730', opts); // 같은 날짜·슬롯 재실행

    expect(r1.sent).toBe(1);
    expect(r2.sent).toBe(0);
    expect(r2.skipped).toBe(1);
    expect(notifier.send).toHaveBeenCalledTimes(1); // 중복 발송 없음
  });
});

describe('candidateVideos — 조회 실패를 삼키지 않음(오탐 "새 소식 없음" 방지)', () => {
  // 특정 테이블 조회만 error 를 돌려주는 최소 fake. 나머지는 정상 데이터.
  function erroringSupabase(errorTable: string) {
    const from = (table: string) => {
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        in: () => b,
        gte: () => b,
        order: () => b,
        limit: () => b,
        maybeSingle: () =>
          Promise.resolve({ data: { summary_length: 'normal', exclude_over_2h: true }, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const error = table === errorTable ? { message: 'statement timeout' } : null;
          const data =
            table === 'subscriptions'
              ? [{ channel_id: 'c1', active_since: null }]
              : table === 'videos'
                ? [
                    {
                      id: 'v1',
                      title: 'T',
                      url: 'u',
                      channel_id: 'c1',
                      created_at: '2026-07-11T00:00:00Z',
                      published_at: '2026-07-11T00:00:00Z',
                      duration_seconds: 600,
                    },
                  ]
                : [];
          return Promise.resolve({ data: error ? null : data, error }).then(res, rej);
        },
      };
      return b;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { from } as any;
  }

  it('videos 조회 error 를 [] 로 삼키지 않고 throw 한다', async () => {
    await expect(candidateVideos(erroringSupabase('videos'), 'u1', null)).rejects.toThrow(
      /영상 조회 실패/,
    );
  });

  it('summaries 조회 error 를 [] 로 삼키지 않고 throw 한다', async () => {
    await expect(candidateVideos(erroringSupabase('summaries'), 'u1', null)).rejects.toThrow(
      /요약 조회 실패/,
    );
  });

  it('빈 core_text 요약 영상은 후보에서 제외한다(제목 N = 본문 N)', async () => {
    const base = {
      subscriptions: [{ channel_id: 'c1', active_since: null }],
      videos: [
        {
          id: 'v1',
          title: 'T',
          url: 'u',
          channel_id: 'c1',
          created_at: '2026-07-11T00:00:00Z',
          published_at: '2026-07-11T00:00:00Z',
          duration_seconds: 600,
        },
      ],
      deliveries: [],
    };
    const singles = { user_settings: { summary_length: 'normal', exclude_over_2h: true } };

    const blank = makeSupabase(
      { ...base, summaries: [{ video_id: 'v1', headline: 'H', core_text: '  ' }] } as Record<string, Rows>,
      singles,
    );
    expect(await candidateVideos(blank.client, 'u1', null)).toEqual([]);

    const filled = makeSupabase(
      { ...base, summaries: [{ video_id: 'v1', headline: 'H', core_text: 'C' }] } as Record<string, Rows>,
      singles,
    );
    const res = await candidateVideos(filled.client, 'u1', null);
    expect(res).toHaveLength(1);
    expect(res[0].videoId).toBe('v1');
  });
});
