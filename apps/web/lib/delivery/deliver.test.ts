import { describe, it, expect } from 'vitest';
import { deliverAll } from './deliver';
import type { SlotCode } from '@/lib/time';

/**
 * 발송 선별을 서버측 RPC(get_deliverable_videos)로 이관한 뒤의 배선 회귀.
 * 핵심: deliverAll 은 videos 를 클라이언트에서 직접 조회하지 않고 RPC 결과만 사용한다
 * (과거 무제한 ASC 조회가 PostgREST 행 상한에 신규 콘텐츠를 절단해 오탐 "새 소식 없음"을
 * 유발했던 버그의 재발 방지). 준비된 항목이 있으면 발송·원장 기록, 없으면 skip_empty 에 따른 처리.
 */
type Row = Record<string, unknown>;

interface FakeConfig {
  profiles: Row[];
  settings: Row[];
  membership?: Row[];
  usage?: Row[];
  pushSubs?: Row[];
  rpc: Record<string, Row[]>; // userId -> get_deliverable_videos 반환행
}

function fakeSupabase(cfg: FakeConfig) {
  const fromTables: string[] = [];
  const rpcCalls: { name: string; args: Row }[] = [];
  const deliveriesUpserts: Row[] = [];
  const usageUpserts: Row[] = [];

  const topLevel: Record<string, Row[]> = {
    profiles: cfg.profiles,
    user_settings: cfg.settings,
    push_subscriptions: cfg.pushSubs ?? [],
    membership: cfg.membership ?? [],
    membership_usage: cfg.usage ?? [],
  };

  // .select() 는 (1) 직접 await → {data: 전체행}, (2) .eq().maybeSingle() → 단건, 둘 다 지원하는 thenable.
  function selectFor(table: string) {
    const result = { data: topLevel[table] ?? [], error: null };
    return {
      then: (res: (v: unknown) => unknown) => res(result),
      eq(col: string, val: unknown) {
        const one = {
          eq: () => one,
          maybeSingle: async () => ({
            data: (topLevel[table] ?? []).find((r) => r[col] === val) ?? null,
            error: null,
          }),
        };
        return one;
      },
    };
  }

  const client = {
    from(table: string) {
      fromTables.push(table);
      return {
        select: () => selectFor(table),
        upsert: (rows: Row[] | Row) => {
          if (table === 'deliveries') deliveriesUpserts.push(...(Array.isArray(rows) ? rows : [rows]));
          if (table === 'membership_usage') usageUpserts.push(rows as Row);
          return Promise.resolve({ error: null });
        },
        delete: () => ({ in: () => Promise.resolve({ error: null }) }),
      };
    },
    rpc: (name: string, args: Row) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: cfg.rpc[args.p_user as string] ?? [], error: null });
    },
  };
  return { client, fromTables, rpcCalls, deliveriesUpserts, usageUpserts };
}

interface SentRecord {
  recipient: unknown;
  message: { subject?: string; title?: string; body?: string };
}
function fakeNotifier() {
  const sent: SentRecord[] = [];
  return {
    notifier: { send: async (recipient: unknown, message: SentRecord['message']) => void sent.push({ recipient, message }) },
    sent,
  };
}

const baseSetting = (over: Row): Row => ({
  delivery_slots: ['0730'],
  push_slot_0730: false,
  push_slot_1130: false,
  push_slot_1730: false,
  push_slot_2130: false,
  skip_empty_email: true,
  skip_empty_push: true,
  summary_length: 'normal',
  ...over,
});

const deps = (client: unknown, notifier: unknown) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: client as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notifier: notifier as any,
  pushNotifier: null,
  nowIso: '2026-07-14T00:00:00.000Z',
});

describe('deliverAll — 서버측 RPC 발송 선별', () => {
  it('RPC 가 준비된 항목을 반환하면 다이제스트를 발송하고 원장(deliveries)에 sent 로 기록한다', async () => {
    const { client, deliveriesUpserts, rpcCalls, fromTables } = fakeSupabase({
      profiles: [{ id: 'u1', email: 'u1@x.com' }],
      settings: [{ user_id: 'u1', delivery_email: 'u1@x.com', ...baseSetting({}) }],
      rpc: {
        u1: [{ video_id: 'v1', title: 'T1', url: 'http://y/1', headline: 'H1', core_text: 'C1', duration_seconds: 300 }],
      },
    });
    const { notifier, sent } = fakeNotifier();

    const r = await deliverAll('0730' as SlotCode, deps(client, notifier));

    expect(r.sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].message.subject).toContain('새 소식 1개');
    expect(deliveriesUpserts).toContainEqual(
      expect.objectContaining({ user_id: 'u1', video_id: 'v1', status: 'sent' }),
    );
    // RPC 로만 선별하고 videos 를 직접 조회하지 않는다(행 상한 절단 재발 방지).
    expect(rpcCalls[0]).toMatchObject({ name: 'get_deliverable_videos', args: { p_user: 'u1', p_mode: 'normal' } });
    expect(fromTables).not.toContain('videos');
  });

  it('RPC 가 빈 결과 + skip_empty_email=false 면 "새 소식 없음"을 발송(empty 집계)', async () => {
    const { client } = fakeSupabase({
      profiles: [{ id: 'u1', email: 'u1@x.com' }],
      settings: [{ user_id: 'u1', delivery_email: 'u1@x.com', ...baseSetting({ skip_empty_email: false }) }],
      rpc: { u1: [] },
    });
    const { notifier, sent } = fakeNotifier();

    const r = await deliverAll('0730' as SlotCode, deps(client, notifier));

    expect(r.empty).toBe(1);
    expect(r.sent).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].message.subject).toBe('겟꿀 · 새 소식 없음');
  });

  it('RPC 가 빈 결과 + skip_empty_email=true(기본) 면 아무것도 발송하지 않는다', async () => {
    const { client, deliveriesUpserts } = fakeSupabase({
      profiles: [{ id: 'u1', email: 'u1@x.com' }],
      settings: [{ user_id: 'u1', delivery_email: 'u1@x.com', ...baseSetting({ skip_empty_email: true }) }],
      rpc: { u1: [] },
    });
    const { notifier, sent } = fakeNotifier();

    const r = await deliverAll('0730' as SlotCode, deps(client, notifier));

    expect(r.sent).toBe(0);
    expect(r.empty).toBe(0);
    expect(sent).toHaveLength(0);
    expect(deliveriesUpserts).toHaveLength(0);
  });
});
