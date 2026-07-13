import { describe, it, expect } from 'vitest';
import { candidateVideos } from './deliver';

/**
 * 회귀 가드 — 인시던트 2026-07-13: candidateVideos 의 videos 조회가 서버 max-rows(1000) 상한에
 * 걸려 '가장 오래된 1000개'만 받아, 멤버십 publish-floor 이후 영상을 못 봐서 고볼륨 구독자가
 * 조용히 미발송되던 버그. 수정: floor 를 SQL(.gte)로 내려 상한이 '적격 구간'에 적용되게 함.
 *
 * fake supabase 의 videos 조회는 실제 서버처럼 (gte 필터 → published_at 오름차순 → 상한 slice)
 * 순서로 동작한다. serverCap 을 작게 잡아, floor 를 SQL 로 내리지 않으면 후보가 0이 되는 상황을 재현.
 */
type V = {
  id: string;
  title: string;
  url: string;
  channel_id: string;
  created_at: string;
  published_at: string;
  duration_seconds: number;
};

function fakeSupabase(opts: {
  setting: Record<string, unknown> | null;
  subs: { channel_id: string; active_since: string | null }[];
  videos: V[];
  summaries: { video_id: string; headline: string; core_text: string }[];
  dels: { video_id: string }[];
  serverCap: number;
}) {
  const from = (table: string): unknown => {
    if (table === 'user_settings') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.setting, error: null }) }) }),
      };
    }
    if (table === 'videos') {
      let floor: string | null = null;
      let lim = Infinity;
      const b: Record<string, unknown> = {
        select: () => b,
        eq: () => b,
        in: () => b,
        gte: (_col: string, val: string) => {
          floor = val;
          return b;
        },
        order: () => b,
        limit: (n: number) => {
          lim = n;
          return b;
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          let rows = [...opts.videos];
          if (floor != null) rows = rows.filter((v) => v.published_at >= (floor as string)); // 서버가 상한 前에 gte 적용
          rows.sort((a, z) => a.published_at.localeCompare(z.published_at)); // published_at 오름차순
          rows = rows.slice(0, Math.min(lim, opts.serverCap)); // 서버 max-rows 상한
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return b;
    }
    const canned: Record<string, unknown[]> = {
      subscriptions: opts.subs,
      summaries: opts.summaries,
      deliveries: opts.dels,
    };
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      in: () => b,
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve({ data: canned[table] ?? [], error: null }).then(res, rej),
    };
    return b;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any;
}

const v = (id: string, published: string): V => ({
  id,
  title: id,
  url: `http://x/${id}`,
  channel_id: 'c1',
  created_at: published,
  published_at: published,
  duration_seconds: 600,
});

describe('candidateVideos — 서버 1000행 상한 회귀(인시던트 2026-07-13)', () => {
  it('done 영상이 상한을 넘어도 멤버십 floor 이후 영상을 후보로 반환한다', async () => {
    const floor = '2026-07-10T13:00:00Z';
    const client = fakeSupabase({
      setting: { summary_length: 'normal', exclude_over_2h: true },
      subs: [{ channel_id: 'c1', active_since: null }],
      // floor 이전 3개 + 이후 1개. serverCap=3 이라, floor 를 SQL 로 안 내리면
      // 오래된 3개(전부 floor 이전)만 잡혀 후보가 0이 됐던 버그 상황.
      videos: [
        v('old1', '2026-07-08T00:00:00Z'),
        v('old2', '2026-07-09T00:00:00Z'),
        v('old3', '2026-07-09T12:00:00Z'),
        v('new1', '2026-07-12T00:00:00Z'),
      ],
      summaries: [{ video_id: 'new1', headline: 'H', core_text: 'C' }],
      dels: [],
      serverCap: 3,
    });
    const out = await candidateVideos(client, 'u1', floor);
    expect(out.map((d) => d.videoId)).toEqual(['new1']);
  });

  it('멤버십 없으면(floor null) 오래된 순 후보 유지', async () => {
    const client = fakeSupabase({
      setting: { summary_length: 'normal', exclude_over_2h: true },
      subs: [{ channel_id: 'c1', active_since: null }],
      videos: [v('a', '2026-07-08T00:00:00Z'), v('b', '2026-07-09T00:00:00Z')],
      summaries: [
        { video_id: 'a', headline: 'H', core_text: 'C' },
        { video_id: 'b', headline: 'H', core_text: 'C' },
      ],
      dels: [{ video_id: 'a' }], // a 는 이미 발송
      serverCap: 1000,
    });
    const out = await candidateVideos(client, 'u1', null);
    expect(out.map((d) => d.videoId)).toEqual(['b']);
  });
});
