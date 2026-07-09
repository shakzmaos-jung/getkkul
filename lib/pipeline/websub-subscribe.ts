import { websubTopicUrl } from '@/lib/pipeline/websub';
import { createPipelineClient } from '@/lib/pipeline/supabase';

/**
 * WebSub 구독 유지 (pipeline-reliability REQ-A2). 허브(PubSubHubbub)에 subscribe 를 보내
 * 채널 신규 영상을 콜백으로 받는다. 리스(≈5일) 만료 전 재구독한다. 파이프라인 스텝으로 주기 실행.
 * 시크릿(WEBSUB_VERIFY_TOKEN/SECRET) 없으면 no-op.
 */

const HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
const LEASE_SECONDS = 432000; // 5일
const RENEW_BEFORE_MS = 2 * 24 * 60 * 60 * 1000; // 만료 2일 전 갱신

type SupabaseClient = ReturnType<typeof createPipelineClient>;

export interface WebSubState {
  status: string | null;
  lease_expires_at: string | null;
}

/** 재구독 필요 판정: active + 리스 여유(>2일)가 아니면 (재)구독한다. */
export function needsResubscribe(state: WebSubState | undefined, nowMs: number): boolean {
  if (!state || state.status !== 'active' || !state.lease_expires_at) return true;
  return new Date(state.lease_expires_at).getTime() - nowMs <= RENEW_BEFORE_MS;
}

/** 허브 subscribe/unsubscribe 폼 파라미터(x-www-form-urlencoded) 구성. */
export function buildHubParams(
  channelId: string,
  callbackUrl: string,
  verifyToken: string,
  secret: string,
  mode: 'subscribe' | 'unsubscribe',
): string {
  const p = new URLSearchParams();
  p.set('hub.callback', callbackUrl);
  p.set('hub.topic', websubTopicUrl(channelId));
  p.set('hub.mode', mode);
  p.set('hub.verify', 'async');
  p.set('hub.verify_token', verifyToken);
  p.set('hub.secret', secret);
  if (mode === 'subscribe') p.set('hub.lease_seconds', String(LEASE_SECONDS));
  return p.toString();
}

export interface RenewResult {
  channels: number;
  subscribed: number; // subscribe 요청 성공(허브 202)
  skipped: number; // 아직 여유
  failed: number;
}

export async function renewWebSubSubscriptions(
  deps: {
    supabase?: SupabaseClient;
    fetchFn?: typeof fetch;
    nowMs?: number;
    callbackUrl?: string;
    verifyToken?: string;
    secret?: string;
  } = {},
): Promise<RenewResult> {
  const supabase = deps.supabase ?? createPipelineClient();
  const doFetch = deps.fetchFn ?? fetch;
  const now = deps.nowMs ?? Date.now();
  const base = process.env.APP_BASE_URL ?? 'https://getkkul.vercel.app';
  const callbackUrl = deps.callbackUrl ?? `${base}/api/webhooks/youtube`;
  const verifyToken = deps.verifyToken ?? process.env.WEBSUB_VERIFY_TOKEN ?? '';
  const secret = deps.secret ?? process.env.WEBSUB_SECRET ?? '';
  if (!verifyToken || !secret) return { channels: 0, subscribed: 0, skipped: 0, failed: 0 };

  const { data: subs } = await supabase.from('subscriptions').select('channel_id');
  const channels = [...new Set((subs ?? []).map((s) => s.channel_id))];

  const { data: states } = await supabase
    .from('websub_subscriptions')
    .select('channel_id, status, lease_expires_at');
  const stateByChannel = new Map((states ?? []).map((s) => [s.channel_id, s]));

  let subscribed = 0;
  let skipped = 0;
  let failed = 0;
  const nowIso = new Date(now).toISOString();

  for (const ch of channels) {
    if (!needsResubscribe(stateByChannel.get(ch), now)) {
      skipped++;
      continue;
    }
    try {
      const res = await doFetch(HUB_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: buildHubParams(ch, callbackUrl, verifyToken, secret, 'subscribe'),
      });
      const ok = res.status === 202 || res.status === 204;
      // 확정(active/lease)은 허브가 콜백 GET 으로 확인할 때 route 에서 기록한다. 여기선 pending.
      await supabase.from('websub_subscriptions').upsert(
        {
          channel_id: ch,
          status: ok ? 'pending' : 'expired',
          last_error: ok ? null : `hub ${res.status}`,
          updated_at: nowIso,
        },
        { onConflict: 'channel_id' },
      );
      if (ok) subscribed++;
      else failed++;
    } catch (e) {
      failed++;
      await supabase.from('websub_subscriptions').upsert(
        { channel_id: ch, status: 'expired', last_error: (e as Error).message, updated_at: nowIso },
        { onConflict: 'channel_id' },
      );
    }
  }

  return { channels: channels.length, subscribed, skipped, failed };
}
